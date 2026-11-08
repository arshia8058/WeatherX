export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function numeric(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatNumber(value, { digits = 0, locale = 'en', ...options } = {}) {
  const number = numeric(value);
  if (number === null) return '—';
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    maximumFractionDigits: digits,
    ...options,
  }).format(number);
}

export function convertTemperature(value, unit) {
  const number = numeric(value);
  if (number === null) return null;
  return unit === 'f' ? number * 9 / 5 + 32 : number;
}

export function temperature(value, unit, locale = 'en', digits = 0) {
  const converted = convertTemperature(value, unit);
  if (converted === null) return '—';
  return `${formatNumber(converted, { digits, locale })}°`;
}

export function convertWindSpeed(value, unit) {
  const speed = numeric(value);
  if (speed === null) return null;
  if (unit === 'ms') return speed / 3.6;
  if (unit === 'mph') return speed / 1.609344;
  return speed;
}

export function windSpeed(value, unit, locale = 'en', digits = 0) {
  const converted = convertWindSpeed(value, unit);
  if (converted === null) return '—';
  const label = { kmh: locale === 'fa' ? 'کیلومتر/ساعت' : 'km/h', ms: 'm/s', mph: 'mph' }[unit] || 'km/h';
  return `${formatNumber(converted, { digits, locale })} ${label}`;
}

function parseApiTimestamp(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map((part) => Number(part));
  const second = Number(match[6] || 0);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return date.toISOString().slice(0, 16) === `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}` ? date : null;
}

export function formatApiTime(value, locale = 'en') {
  const date = parseApiTimestamp(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    hour: 'numeric', minute: '2-digit', hour12: locale === 'en', timeZone: 'UTC',
  }).format(date);
}

export function formatApiHour(value, locale = 'en') {
  const date = parseApiTimestamp(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    hour: 'numeric', ...(locale === 'en' ? { hour12: true } : { hourCycle: 'h23' }), timeZone: 'UTC',
  }).format(date);
}

export function formatApiDate(value, locale = 'en', options = {}) {
  if (typeof value !== 'string') return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '—';
  const [, year, month, day] = match.map((part) => Number(part));
  if (month < 1 || month > 12 || day < 1 || day > 31) return '—';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) return '—';
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC', ...options,
  }).format(date);
}

export function dayDiff(dateA, dateB) {
  const a = Date.parse(`${dateA}T00:00:00Z`);
  const b = Date.parse(`${dateB}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) : NaN;
}

export function countryName(code, locale = 'en') {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale === 'fa' ? 'fa-IR' : 'en'], { type: 'region' }).of(code) || '';
  } catch { return ''; }
}

export function direction(degrees, t, locale = 'en') {
  const value = numeric(degrees);
  if (value === null || value < 0 || value > 360) return '—';
  const key = ['dirN', 'dirNE', 'dirE', 'dirSE', 'dirS', 'dirSW', 'dirW', 'dirNW'][Math.round((value % 360) / 45) % 8];
  return `${t(key)} ${formatNumber(value, { digits: 0, locale })}°`;
}

export function uvDescription(value, t, locale = 'en') {
  const amount = numeric(value);
  if (amount === null || amount < 0) return '—';
  let label = 'uvLow';
  if (amount >= 11) label = 'uvExtreme';
  else if (amount >= 8) label = 'uvVeryHigh';
  else if (amount >= 6) label = 'uvHigh';
  else if (amount >= 3) label = 'uvModerate';
  return `${formatNumber(amount, { digits: 1, locale })} · ${t(label)}`;
}

export function relativeTime(timestamp, locale = 'en') {
  if (!Number.isFinite(timestamp)) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return locale === 'fa' ? 'همین حالا' : 'just now';
  if (locale === 'fa') return `${new Intl.NumberFormat('fa-IR').format(minutes)} دقیقه پیش`;
  return `${minutes} min ago`;
}

export function localClock(timeZone, locale = 'en') {
  const safeZone = typeof timeZone === 'string' && timeZone ? timeZone : undefined;
  const date = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: safeZone,
  }).format(Date.now());
  const time = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    hour: 'numeric', minute: '2-digit', hour12: locale === 'en', timeZone: safeZone,
  }).format(Date.now());
  return { date, time };
}

export function apiClockMinutes(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map((part) => Number(part));
  const second = Number(match[6] || 0);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== `${match[1]}-${match[2]}-${match[3]}`) return null;
  return hour <= 23 && minute <= 59 && second <= 59 ? hour * 60 + minute : null;
}

export function daylightMinutes(sunrise, sunset) {
  if (!Number.isInteger(sunrise) || sunrise < 0 || sunrise >= 1440 || !Number.isInteger(sunset) || sunset < 0 || sunset >= 1440) return null;
  return (sunset - sunrise + 1440) % 1440;
}

export function daypartAt(hour, minute, sunrise = null, sunset = null, isDay = null) {
  const validClock = Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(minute) && minute >= 0 && minute <= 59;
  const current = validClock ? hour * 60 + minute : null;
  const daylight = daylightMinutes(sunrise, sunset);
  if (daylight !== null && current !== null) {
    if (daylight === 0) return isDay === 1 ? 'Daylight' : 'Night';
    if ((current - sunrise + 1440) % 1440 >= daylight) return 'Night';
    if (hour < 11) return 'Morning';
    if (hour < 17) return 'Day';
    return 'Evening';
  }
  if (isDay === 0) return 'Night';
  if (isDay === 1) return 'Daylight';
  if (!validClock) return 'Day';
  if (hour < 5 || hour >= 21) return 'Night';
  if (hour < 11) return 'Morning';
  if (hour < 17) return 'Day';
  return 'Evening';
}
