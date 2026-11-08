import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClockMinutes, convertTemperature, convertWindSpeed, daylightMinutes, daypartAt, direction, formatApiDate, formatApiHour, formatApiTime, numeric, temperature, uvDescription, windSpeed } from '../js/utils.js';

const t = (key) => ({ dirN: 'N', dirNE: 'NE', dirE: 'E', dirSE: 'SE', dirS: 'S', dirSW: 'SW', dirW: 'W', dirNW: 'NW', uvLow: 'Low', uvModerate: 'Moderate', uvHigh: 'High', uvVeryHigh: 'Very high', uvExtreme: 'Extreme' })[key];

test('temperature conversions are accurate and preserve zero values', () => {
  assert.equal(convertTemperature(0, 'f'), 32);
  assert.equal(convertTemperature(-40, 'f'), -40);
  assert.equal(convertTemperature(null, 'f'), null);
  assert.equal(temperature(0, 'c', 'en'), '0°');
});

test('wind conversion covers km/h, m/s and mph', () => {
  assert.equal(convertWindSpeed(36, 'ms'), 10);
  assert.ok(Math.abs(convertWindSpeed(16.09344, 'mph') - 10) < 0.00001);
  assert.equal(convertWindSpeed(0, 'kmh'), 0);
  assert.equal(windSpeed(null, 'kmh'), '—');
});

test('missing and out-of-range compass values are not rendered as north', () => {
  assert.equal(direction(null, t), '—');
  assert.equal(direction(undefined, t), '—');
  assert.equal(direction(361, t), '—');
  assert.match(direction(0, t), /^N /);
  assert.match(direction(360, t), /^N /);
});

test('missing UV is rendered as unavailable rather than a false low value', () => {
  assert.equal(uvDescription(null, t), '—');
  assert.equal(uvDescription(undefined, t), '—');
  assert.match(uvDescription(0, t), /Low/);
  assert.match(uvDescription(2.7, t), /^2\.7 · Low$/);
});

test('daypart selection follows local sunrise and polar day/night state', () => {
  assert.equal(daypartAt(22, 0, 360, 1200, 1), 'Night');
  assert.equal(daypartAt(8, 30, 360, 1200, 1), 'Morning');
  assert.equal(daypartAt(2, 0, null, null, 0), 'Night');
  assert.equal(daypartAt(2, 0, null, null, 1), 'Daylight');
  assert.equal(daypartAt(14, 0), 'Day');
  assert.equal(daylightMinutes(1380, 60), 120);
  assert.equal(daypartAt(0, 30, 1380, 60, 1), 'Morning');
});

test('formatters handle local Open-Meteo wall-clock timestamps and reject malformed values', () => {
  assert.notEqual(formatApiTime('2026-05-01T09:30', 'en'), '—');
  assert.equal(formatApiTime('bad', 'en'), '—');
  assert.equal(formatApiTime('2026-13-01T99:99', 'en'), '—');
  assert.equal(formatApiTime('2026-05-01T22:00oops', 'en'), '—');
  assert.equal(formatApiTime('2026-05-01T22:00:60', 'en'), '—');
  assert.equal(formatApiTime('2026-05-01T22:00', 'en'), '10:00 PM');
  assert.equal(formatApiHour('2026-05-01T22:00', 'en'), '10 PM');
  assert.equal(formatApiHour('2026-05-01T13:00', 'en'), '1 PM');
  assert.equal(formatApiHour('invalid', 'en'), '—');
  assert.notEqual(formatApiDate('2026-05-01', 'fa'), '—');
  assert.equal(formatApiDate('2026-02-31', 'en'), '—');
  assert.equal(apiClockMinutes('2026-05-01T25:90'), null);
  assert.equal(apiClockMinutes('2026-02-31T12:00'), null);
  assert.equal(apiClockMinutes('garbageT12:00'), null);
  assert.equal(apiClockMinutes('2026-05-01T23:45'), 1425);
  assert.equal(apiClockMinutes('2026-05-01T23:45:30'), 1425);
  assert.equal(numeric(''), null);
  assert.equal(numeric(0), 0);
});
