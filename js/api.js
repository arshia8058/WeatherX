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
function valuesInRange(values, minimum, maximum, { integers = false } = {}) {
  return Array.isArray(values) && values.every((value) => value === null || value === undefined || (
    Number.isFinite(value) && value >= minimum && value <= maximum && (!integers || Number.isInteger(value))
  ));
}
function validLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}
function validLocalDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value || '');
  if (!match || !validLocalDate(`${match[1]}-${match[2]}-${match[3]}`)) return false;
  const hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6] || 0);
  return hour <= 23 && minute <= 59 && second <= 59;
}
function nearestTimeIndex(times, targetTime) {
  const target = Date.parse(`${targetTime.slice(0, 16)}Z`);
  if (!Number.isFinite(target)) return 0;
  let bestIndex = 0, bestDistance = Infinity;
  times.forEach((time, index) => {
    const value = Date.parse(`${time.slice(0, 16)}Z`);
    const distance = Math.abs(value - target);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestIndex;
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

function validWeatherCacheItem(item) {
  if (!item?.data || !Number.isFinite(item.savedAt)) return false;
  try { validateForecast(item.data); return true; }
  catch { return false; }
}

export function validateForecast(data) {
  const current = data?.current;
  if (!data || typeof data.timezone !== 'string' || !data.timezone) {
    throw new ApiError('The weather service did not provide a valid local timezone.', { kind: 'invalid-data' });
  }
  try { new Intl.DateTimeFormat('en', { timeZone: data.timezone }); }
  catch { throw new ApiError('The weather service returned an invalid timezone.', { kind: 'invalid-data' }); }
  if (!current || !validLocalDateTime(current.time) || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
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
  if (!data.hourly.time.every(validLocalDateTime) || !data.daily.time.every(validLocalDate)) {
    throw new ApiError('The weather service returned malformed timestamps.', { kind: 'invalid-data' });
  }
  if (!data.hourly.time.some((time) => time.slice(0, 13) === current.time.slice(0, 13))) {
    throw new ApiError('The current observation does not match the hourly forecast.', { kind: 'invalid-data' });
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
  if (!numericSeries(data.daily.precipitation_probability_max) || !data.daily.sunrise.every((time) => time === null || validLocalDateTime(time)) || !data.daily.sunset.every((time) => time === null || validLocalDateTime(time))) {
    throw new ApiError('Invalid daily weather details.', { kind: 'invalid-data' });
  }
  const hourlyRanges = [
    ['temperature_2m', -100, 70], ['weather_code', 0, 99, true], ['precipitation_probability', 0, 100],
    ['wind_speed_10m', 0, 500], ['wind_direction_10m', 0, 360], ['visibility', 0, 200000], ['uv_index', 0, 100],
  ];
  for (const [field, minimum, maximum, integers] of hourlyRanges) {
    if (!valuesInRange(data.hourly[field], minimum, maximum, { integers })) throw new ApiError(`Out-of-range hourly ${field} values.`, { kind: 'invalid-data' });
  }
  const dailyRanges = [
    ['temperature_2m_max', -100, 70], ['temperature_2m_min', -100, 70], ['weather_code', 0, 99, true],
    ['precipitation_probability_max', 0, 100],
  ];
  for (const [field, minimum, maximum, integers] of dailyRanges) {
    if (!valuesInRange(data.daily[field], minimum, maximum, { integers })) throw new ApiError(`Out-of-range daily ${field} values.`, { kind: 'invalid-data' });
  }
  if (data.daily.temperature_2m_min.some((minimum, index) => minimum > data.daily.temperature_2m_max[index])) {
    throw new ApiError('The daily high/low temperatures are inconsistent.', { kind: 'invalid-data' });
  }
  const currentRanges = {
    temperature_2m: [-100, 70], relative_humidity_2m: [0, 100], apparent_temperature: [-150, 80],
    precipitation: [0, 2000], is_day: [0, 1], wind_speed_10m: [0, 500], wind_direction_10m: [0, 360], surface_pressure: [0, 1200],
  };
  for (const [field, [minimum, maximum]] of Object.entries(currentRanges)) {
    const value = current[field];
    if (!finiteOrNull(value) || (value !== null && value !== undefined && (value < minimum || value > maximum))) {
      throw new ApiError(`Invalid current ${field} value.`, { kind: 'invalid-data' });
    }
  }
  if (!Number.isInteger(current.weather_code) || current.weather_code < 0 || current.weather_code > 99) {
    throw new ApiError('Invalid current weather code.', { kind: 'invalid-data' });
  }
  if (current.is_day !== null && current.is_day !== undefined && ![0, 1].includes(current.is_day)) {
    throw new ApiError('Invalid current day/night flag.', { kind: 'invalid-data' });
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
    if (validWeatherCacheItem(item)) {
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
    const stored = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    const all = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    const entries = Object.entries(all)
      .filter(([cachedKey, cachedItem]) => cachedKey !== key && validWeatherCacheItem(cachedItem))
      .sort((a, b) => b[1].savedAt - a[1].savedAt)
      .slice(0, 4);
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
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m,surface_pressure',
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
  if (typeof query !== 'string' || !['en', 'fa'].includes(language)) {
    throw new ApiError('Invalid city-search request.', { kind: 'invalid-request' });
  }
  const normalized = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  if (normalized.length < 2) return [];
  const key = `${language}:${normalized}`;
  const cached = memory.search.get(key);
  if (cached && Date.now() - cached.savedAt < SEARCH_TTL) return cached.results;
  const params = new URLSearchParams({ name: query.trim(), count: '8', language, format: 'json' });
  const data = await requestJSON(`${GEOCODING_URL}?${params}`, signal);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError('The city search returned an invalid payload.', { kind: 'invalid-data' });
  }
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

export async function getAirQuality({ latitude, longitude, signal, targetTime }) {
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    throw new ApiError('Invalid geographic coordinates.', { kind: 'invalid-request' });
  }
  const key = coordinateKey(latitude, longitude);
  const targetHour = validLocalDateTime(targetTime) ? targetTime.slice(0, 13) : null;
  const cached = memory.air.get(key);
  if (cached && Date.now() - cached.savedAt < AIR_TTL && (!targetHour || cached.data.time.slice(0, 13) === targetHour)) return cached.data;
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    hourly: 'us_aqi,pm2_5,pm10,ozone', timezone: 'auto', forecast_hours: '24',
  });
  const data = await requestJSON(`${AIR_URL}?${params}`, signal);
  if (!data || typeof data !== 'object' || Array.isArray(data) || !arrayHasValues(data.hourly, ['time', 'us_aqi', 'pm2_5', 'pm10', 'ozone'], 1) || !data.hourly.time.every(validLocalDateTime)) {
    throw new ApiError('The air-quality service returned incomplete data.', { kind: 'invalid-data' });
  }
  const airLength = data.hourly.time.length;
  const ranges = { us_aqi: [0, 500], pm2_5: [0, 100000], pm10: [0, 100000], ozone: [0, 100000] };
  for (const [field, [minimum, maximum]] of Object.entries(ranges)) {
    if (data.hourly[field].length !== airLength || !numericSeries(data.hourly[field]) || !valuesInRange(data.hourly[field], minimum, maximum)) {
      throw new ApiError(`Invalid air-quality ${field} data.`, { kind: 'invalid-data' });
    }
  }
  const matchingIndex = targetHour ? data.hourly.time.findIndex((time) => time.slice(0, 13) === targetHour) : -1;
  let index = matchingIndex >= 0 ? matchingIndex : targetTime && validLocalDateTime(targetTime) ? nearestTimeIndex(data.hourly.time, targetTime) : 0;
  if (data.hourly.us_aqi[index] === null || data.hourly.us_aqi[index] === undefined) {
    const available = data.hourly.us_aqi.map((value, itemIndex) => value === null || value === undefined ? -1 : itemIndex).filter((itemIndex) => itemIndex >= 0);
    if (available.length) {
      const availableTimes = available.map((itemIndex) => data.hourly.time[itemIndex]);
      index = targetTime && validLocalDateTime(targetTime) ? available[nearestTimeIndex(availableTimes, targetTime)] : available[0];
    }
  }
  const values = Object.fromEntries(Object.keys(ranges).map((field) => [field, data.hourly[field][index]]));
  const item = { ...values, time: data.hourly.time[index] };
  remember(memory.air, key, { data: item, savedAt: Date.now() }, 20, AIR_TTL);
  return item;
}
