import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, getAirQuality, getForecast, searchCities, validateForecast } from '../js/api.js';
import { forecastFixture } from './fixtures.js';

const originalFetch = globalThis.fetch;
function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

test('forecast accepts zero coordinates and requests only selected forecast fields', async () => {
  const fixture = forecastFixture();
  let requestUrl;
  globalThis.fetch = async (url) => { requestUrl = new URL(url); return jsonResponse(fixture); };
  const result = await getForecast({ latitude: 0, longitude: 0, force: true });
  assert.equal(result.data.current.temperature_2m, 12.5);
  assert.equal(requestUrl.searchParams.get('latitude'), '0');
  assert.equal(requestUrl.searchParams.get('longitude'), '0');
  assert.equal(requestUrl.searchParams.get('timezone'), 'auto');
  assert.equal(requestUrl.searchParams.get('forecast_hours'), '24');
  assert.equal(requestUrl.searchParams.get('forecast_days'), '7');
  assert.match(requestUrl.searchParams.get('current'), /is_day/);
  assert.match(requestUrl.searchParams.get('hourly'), /visibility/);
  assert.match(requestUrl.searchParams.get('hourly'), /uv_index/);
  assert.equal(requestUrl.searchParams.get('wind_speed_unit'), 'kmh');
});

test('forecast cache avoids duplicate requests and clearly marks stale offline data', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse(forecastFixture()); };
  const first = await getForecast({ latitude: 20.1234, longitude: 30.5678, force: true });
  const cached = await getForecast({ latitude: 20.1234, longitude: 30.5678 });
  assert.equal(first.stale, false);
  assert.equal(cached.fromCache, true);
  assert.equal(calls, 1);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  const stale = await getForecast({ latitude: 20.1234, longitude: 30.5678, force: true });
  assert.equal(stale.stale, true);
  assert.equal(stale.updatedAt, first.updatedAt);
});

test('invalid coordinates and malformed forecast responses are rejected', async () => {
  await assert.rejects(getForecast({ latitude: 91, longitude: 0 }), (error) => error instanceof ApiError && error.kind === 'invalid-request');
  assert.throws(() => validateForecast({ current: { time: 'now', temperature_2m: 1, weather_code: 0 } }), (error) => error.kind === 'invalid-data');
  const invalidTime = forecastFixture();
  invalidTime.current.time = '2026-02-31T00:00';
  assert.throws(() => validateForecast(invalidTime), (error) => error.kind === 'invalid-data');
  const invalidProbability = forecastFixture();
  invalidProbability.hourly.precipitation_probability[3] = 140;
  assert.throws(() => validateForecast(invalidProbability), (error) => error.kind === 'invalid-data');
  const wrongHour = forecastFixture();
  wrongHour.current.time = '2026-05-02T00:00';
  assert.throws(() => validateForecast(wrongHour), (error) => error.kind === 'invalid-data');
  const invalidDayFlag = forecastFixture();
  invalidDayFlag.current.is_day = 2;
  assert.throws(() => validateForecast(invalidDayFlag), (error) => error.kind === 'invalid-data');
});

test('HTTP errors retain status and categorize rate/server errors', async () => {
  globalThis.fetch = async () => jsonResponse({ reason: 'rate limited' }, 429);
  await assert.rejects(getForecast({ latitude: 10, longitude: 11, force: true }), (error) => error.kind === 'service' && error.status === 429);
});

test('an aborted weather request remains an abort, not a stale-cache success', async () => {
  globalThis.fetch = async (_url, { signal }) => {
    signal.throwIfAborted();
    return jsonResponse(forecastFixture());
  };
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getForecast({ latitude: 12, longitude: 14, signal: controller.signal }), (error) => error.name === 'AbortError');
});

test('city search rejects invalid language and malformed successful payloads', async () => {
  await assert.rejects(searchCities('Paris', 'xx'), (error) => error.kind === 'invalid-request');
  globalThis.fetch = async () => jsonResponse(null);
  await assert.rejects(searchCities('Paris', 'en'), (error) => error instanceof ApiError && error.kind === 'invalid-data');
});

test('city search accepts zero coordinates, removes duplicate results, and caches repeats', async () => {
  let calls = 0;
  const city = { id: 7, name: 'Test City', latitude: 0, longitude: 0, country: 'Example', country_code: 'EX' };
  globalThis.fetch = async () => { calls += 1; return jsonResponse({ results: [city, city] }); };
  const first = await searchCities('Test City', 'en');
  const second = await searchCities('Test City', 'en');
  assert.equal(first.length, 1);
  assert.equal(first[0].latitude, 0);
  assert.equal(first[0].longitude, 0);
  assert.equal(second.length, 1);
  assert.equal(calls, 1);
});

test('city search forwards cancellation so obsolete suggestions can be aborted', async () => {
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  const controller = new AbortController();
  const request = searchCities('Obsolete query', 'en', controller.signal);
  controller.abort();
  await assert.rejects(request, (error) => error.name === 'AbortError');
});

test('air-quality readings align with the forecast hour and refresh the cache when that hour changes', async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'air-quality-api.open-meteo.com');
    assert.equal(parsed.searchParams.get('forecast_hours'), '24');
    return jsonResponse({ hourly: {
      time: ['2026-05-01T00:00', '2026-05-01T01:00'], us_aqi: [18, 24],
      pm2_5: [2.1, 3.1], pm10: [4, 5], ozone: [39, 49],
    } });
  };
  const firstHour = await getAirQuality({ latitude: 34, longitude: 35, targetTime: '2026-05-01T00:00' });
  assert.equal(firstHour.us_aqi, 18);
  const nextHour = await getAirQuality({ latitude: 34, longitude: 35, targetTime: '2026-05-01T01:00' });
  assert.equal(nextHour.us_aqi, 24);
  assert.equal(nextHour.pm2_5, 3.1);
  assert.equal(nextHour.time, '2026-05-01T01:00');
  const nearestHour = await getAirQuality({ latitude: 34, longitude: 35, targetTime: '2026-05-01T02:30' });
  assert.equal(nearestHour.time, '2026-05-01T01:00');
  assert.equal(calls, 3);
  globalThis.fetch = async () => jsonResponse({ hourly: {
    time: ['2026-05-01T00:00', '2026-05-01T01:00', '2026-05-01T02:00'],
    us_aqi: [17, null, 30], pm2_5: [1, 2, 3], pm10: [4, 5, 6], ozone: [7, 8, 9],
  } });
  const availableReading = await getAirQuality({ latitude: 35, longitude: 36, targetTime: '2026-05-01T01:00' });
  assert.equal(availableReading.us_aqi, 17);
  assert.equal(availableReading.time, '2026-05-01T00:00');
});

test('geolocation weather cache remains memory-only unless the user saves it', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let persisted = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null, setItem: () => { persisted = true; } },
  });
  globalThis.fetch = async () => jsonResponse(forecastFixture());
  try {
    await getForecast({ latitude: 48.1234, longitude: 2.1234, force: true, persistCache: false });
    assert.equal(persisted, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test.after(() => { globalThis.fetch = originalFetch; });
