const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_CACHE_KEY = 'weatherx-cache-v2';
const WEATHER_TTL = 10 * 60 * 1000;
const SEARCH_TTL = 60 * 60 * 1000;
const AIR_TTL = 30 * 60 * 1000;
const memory = { weather: new Map(), search: new Map(), air: new Map() };

export class ApiError extends Error {
  constructor(message, { kind = 'network', status = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

function coordinateKey(latitude, longitude) {
  return `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
}
function validCoordinate(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function finiteOrNull(value) {
  return value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value));
}
function numericSeries(values, allowNull = true) {
  return Array.isArray(values) && values.every((value) => allowNull ? finiteOrNull(value) : Number.isFinite(value));
}
function arrayHasValues(object, fields, minimum = 1) {
  return fields.every((field) => Array.isArray(object?.[field]) && object[field].length >= minimum);
}
function remember(map, key, item, maximum, ttl) {
  map.delete(key);
  map.set(key, item);
  const now = Date.now();
  for (const [cacheKey, cacheValue] of map) {
    if (now - cacheValue.savedAt >= ttl) map.delete(cacheKey);
  }
  while (map.size > maximum) map.delete(map.keys().next().value);
}

export function validateForecast(data) {
  const current = data?.current;
  if (!data || typeof data.timezone !== 'string' || !data.timezone) {
    throw new ApiError('The weather service did not provide a valid local timezone.', { kind: 'invalid-data' });
  }
  try { new Intl.DateTimeFormat('en', { timeZone: data.timezone }); }
  catch { throw new ApiError('The weather service returned an invalid timezone.', { kind: 'invalid-data' }); }
  if (!current || typeof current.time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(current.time) || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
    throw new ApiError('The weather service returned an incomplete current observation.', { kind: 'invalid-data' });
  }
  if (!arrayHasValues(data.hourly, ['time', 'temperature_2m', 'weather_code', 'precipitation_probability', 'wind_speed_10m', 'wind_direction_10m', 'visibility', 'uv_index'], 24)) {
    throw new ApiError('The weather service returned an incomplete 24-hour forecast.', { kind: 'invalid-data' });
  }
  if (!arrayHasValues(data.daily, ['time', 'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'sunrise', 'sunset'], 7)) {
    throw new ApiError('The weather service returned an incomplete 7-day forecast.', { kind: 'invalid-data' });
  }
  const hourlyLength = data.hourly.time.length;
  const dailyLength = data.daily.time.length;
  for (const field of ['temperature_2m', 'weather_code', 'precipitation_probability', 'wind_speed_10m', 'wind_direction_10m', 'visibility', 'uv_index']) {
    if (data.hourly[field].length !== hourlyLength) throw new ApiError(`Inconsistent hourly ${field} data.`, { kind: 'invalid-data' });
  }
  for (const field of ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'sunrise', 'sunset']) {
    if (data.daily[field].length !== dailyLength) throw new ApiError(`Inconsistent daily ${field} data.`, { kind: 'invalid-data' });
  }
  if (!data.hourly.time.every((time) => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(time)) || !data.daily.time.every((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day))) {
    throw new ApiError('The weather service returned malformed timestamps.', { kind: 'invalid-data' });
  }
  for (const field of ['temperature_2m', 'weather_code']) {
    if (!numericSeries(data.hourly[field], false)) throw new ApiError(`Invalid hourly ${field} values.`, { kind: 'invalid-data' });
  }
  for (const field of ['precipitation_probability', 'wind_speed_10m', 'wind_direction_10m', 'visibility', 'uv_index']) {
    if (!numericSeries(data.hourly[field])) throw new ApiError(`Invalid hourly ${field} values.`, { kind: 'invalid-data' });
  }
  for (const field of ['temperature_2m_max', 'temperature_2m_min', 'weather_code']) {
    if (!numericSeries(data.daily[field], false)) throw new ApiError(`Invalid daily ${field} values.`, { kind: 'invalid-data' });
  }
  if (!numericSeries(data.daily.precipitation_probability_max) || !data.daily.sunrise.every((time) => time === null || typeof time === 'string') || !data.daily.sunset.every((time) => time === null || typeof time === 'string')) {
    throw new ApiError('Invalid daily weather details.', { kind: 'invalid-data' });
  }
  const optionalCurrent = ['relative_humidity_2m', 'apparent_temperature', 'precipitation', 'wind_speed_10m', 'wind_direction_10m', 'surface_pressure'];
  for (const field of optionalCurrent) {
    if (!finiteOrNull(current[field])) throw new ApiError(`Invalid current ${field} value.`, { kind: 'invalid-data' });
  }
  return data;
}

async function requestJSON(url, signal) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out.', 'TimeoutError')), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    let payload;
    try { payload = await response.json(); }
    catch (error) {
      if (signal?.aborted) throw error?.name === 'AbortError' ? error : new DOMException('Request was cancelled.', 'AbortError');
      if (controller.signal.aborted) throw new ApiError('Request timed out.', { kind: 'timeout' });
      throw new ApiError('The service returned an unreadable response.', { kind: 'invalid-data', status: response.status });
    }
    if (!response.ok || payload?.error) {
      throw new ApiError(payload?.reason || payload?.message || `Weather service error (${response.status}).`, {
        kind: response.status >= 500 || response.status === 429 ? 'service' : 'http', status: response.status,
      });
    }
    return payload;
  } catch (error) {
    if (signal?.aborted) throw error?.name === 'AbortError' ? error : new DOMException('Request was cancelled.', 'AbortError');
    if (controller.signal.aborted) throw new ApiError('Request timed out.', { kind: 'timeout' });
    if (error instanceof ApiError) throw error;
    throw new ApiError(error?.message || 'Network request failed.', { kind: 'network' });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

function readWeatherCache(key) {
  const inMemory = memory.weather.get(key);
  if (inMemory) return inMemory;
  try {
    const all = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    const item = all[key];
    if (item?.data && Number.isFinite(item.savedAt)) {
      validateForecast(item.data);
      remember(memory.weather, key, item, 5, Number.POSITIVE_INFINITY);
      return item;
    }
  } catch { /* Storage is optional; continue with a network request. */ }
  return null;
}
function writeWeatherCache(key, item, persist = true) {
  remember(memory.weather, key, item, 5, Number.POSITIVE_INFINITY);
  if (!persist) return;
  try {
    const all = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    const entries = Object.entries(all).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 5);
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(Object.fromEntries([...entries, [key, item]])));
  } catch { /* Quota or privacy restrictions must not block live weather. */ }
}

export async function getForecast({ latitude, longitude, signal, force = false, persistCache = true }) {
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    throw new ApiError('Invalid geographic coordinates.', { kind: 'invalid-request' });
  }
  const key = coordinateKey(latitude, longitude);
  const cached = readWeatherCache(key);
  const now = Date.now();
  if (!force && cached && now - cached.savedAt < WEATHER_TTL) {
    return { data: cached.data, updatedAt: cached.savedAt, fromCache: true, stale: false };
  }
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,visibility,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto', forecast_days: '7', forecast_hours: '24', wind_speed_unit: 'kmh',
  });
  try {
    const data = validateForecast(await requestJSON(`${FORECAST_URL}?${params}`, signal));
    const item = { data, savedAt: Date.now() };
    writeWeatherCache(key, item, persistCache);
    return { data, updatedAt: item.savedAt, fromCache: false, stale: false };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (cached && (error.kind === 'network' || error.kind === 'service' || error.kind === 'timeout')) {
      return { data: cached.data, updatedAt: cached.savedAt, fromCache: true, stale: true };
    }
    throw error;
  }
}

export async function searchCities(query, language = 'en', signal) {
  const normalized = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  if (normalized.length < 2) return [];
  const key = `${language}:${normalized}`;
  const cached = memory.search.get(key);
  if (cached && Date.now() - cached.savedAt < SEARCH_TTL) return cached.results;
  const params = new URLSearchParams({ name: query.trim(), count: '8', language, format: 'json' });
  const data = await requestJSON(`${GEOCODING_URL}?${params}`, signal);
  if (data.results !== undefined && !Array.isArray(data.results)) {
    throw new ApiError('The city search returned an invalid result list.', { kind: 'invalid-data' });
  }
  const seen = new Set();
  const results = (data.results || []).filter((city) => {
    if (!city || typeof city.name !== 'string' || !validCoordinate(city.latitude, -90, 90) || !validCoordinate(city.longitude, -180, 180)) return false;
    const identity = city.id ?? `${city.name.toLowerCase()}:${city.latitude.toFixed(4)}:${city.longitude.toFixed(4)}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  remember(memory.search, key, { results, savedAt: Date.now() }, 50, SEARCH_TTL);
  return results;
}

export async function getAirQuality({ latitude, longitude, signal }) {
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    throw new ApiError('Invalid geographic coordinates.', { kind: 'invalid-request' });
  }
  const key = coordinateKey(latitude, longitude);
  const cached = memory.air.get(key);
  if (cached && Date.now() - cached.savedAt < AIR_TTL) return cached.data;
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    hourly: 'us_aqi,pm2_5,pm10,ozone', timezone: 'auto', forecast_hours: '2',
  });
  const data = await requestJSON(`${AIR_URL}?${params}`, signal);
  if (!arrayHasValues(data.hourly, ['time', 'us_aqi', 'pm2_5', 'pm10', 'ozone'], 1) || typeof data.hourly.time[0] !== 'string') {
    throw new ApiError('The air-quality service returned incomplete data.', { kind: 'invalid-data' });
  }
  const airLength = data.hourly.time.length;
  for (const field of ['us_aqi', 'pm2_5', 'pm10', 'ozone']) {
    if (data.hourly[field].length !== airLength || !numericSeries(data.hourly[field])) {
      throw new ApiError(`Invalid air-quality ${field} data.`, { kind: 'invalid-data' });
    }
  }
  const values = Object.fromEntries(['us_aqi', 'pm2_5', 'pm10', 'ozone'].map((field) => [field, data.hourly[field][0]]));
  const item = { ...values, time: data.hourly.time[0] };
  remember(memory.air, key, { data: item, savedAt: Date.now() }, 20, AIR_TTL);
  return item;
}
