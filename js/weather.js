import { $, formatNumber, temperature, formatApiTime, formatApiHour, formatApiDate, dayDiff, direction, uvDescription, windSpeed, numeric, localClock, apiClockMinutes } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function weatherKind(code) {
  const value = Number(code);
  if (value === 0) return 'sun';
  if (value === 1 || value === 2) return 'partly';
  if (value === 3) return 'cloud';
  if ([45, 48].includes(value)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(value)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(value)) return 'snow';
  return 'partly';
}

export function weatherIcon(code, { large = false, precipitationProbability } = {}) {
  let type = weatherKind(code);
  const chance = numeric(precipitationProbability);
  // A very low chance is shown with a neutral cloud, while the original forecast
  // condition remains available to assistive technology and the chance stays visible.
  if ((type === 'rain' || type === 'snow') && chance !== null && chance <= 10) type = 'cloud';
  const sun = '<circle cx="47" cy="36" r="13" fill="#FFD36E"/><g stroke="#FFD36E" stroke-width="3" stroke-linecap="round"><path d="M47 12v5M47 55v5M23 36h5m38 0h5M30 19l4 4m26 26 4 4m0-34-4 4m-26 26-4 4"/></g>';
  const cloud = '<path d="M30 61h34a14 14 0 0 0 0-28c-1 0-2 .1-3 .3a19 19 0 0 0-37 4A12 12 0 0 0 30 61Z" fill="#fff" stroke="#dce9fb" stroke-width="2"/>';
  let art = '';
  if (type === 'sun') art = sun;
  if (type === 'partly') art = sun + '<path d="M31 65h33a13 13 0 0 0 0-26c-1 0-2 .1-3 .3a18 18 0 0 0-27 4" fill="#fff" stroke="#dce9fb" stroke-width="2" stroke-linecap="round"/>';
  if (type === 'cloud') art = '<path d="M26 63h39a16 16 0 0 0 0-32c-1.1 0-2.2.1-3.3.3a21 21 0 0 0-40 5A13.5 13.5 0 0 0 26 63Z" fill="#fff" stroke="#dce9fb" stroke-width="2"/>';
  if (type === 'rain') art = cloud + '<g stroke="#68a7f8" stroke-width="3" stroke-linecap="round"><path d="m37 68-3 7m17-7-3 7m17-7-3 7"/></g>';
  if (type === 'snow') art = cloud + '<g fill="#74aaf0"><circle cx="36" cy="72" r="2.7"/><circle cx="52" cy="76" r="2.7"/><circle cx="66" cy="70" r="2.7"/></g>';
  if (type === 'fog') art = '<path d="M29 57h35a13 13 0 0 0 0-26c-1 0-2 .1-3 .3a18 18 0 0 0-34 5A12 12 0 0 0 29 57Z" fill="#fff" stroke="#dce9fb" stroke-width="2"/><g stroke="#91b5df" stroke-width="3" stroke-linecap="round"><path d="M23 65h42M31 72h33"/></g>';
  const box = large ? '0 0 92 90' : '10 5 78 80';
  return `<svg class="weather-svg" viewBox="${box}" xmlns="${SVG_NS}" aria-hidden="true">${art}</svg>`;
}

function atIndex(hourly, time) {
  if (!hourly?.time || typeof time !== 'string') return -1;
  const exact = hourly.time.indexOf(time);
  if (exact >= 0) return exact;
  const hourKey = time.slice(0, 13);
  return hourly.time.findIndex((item) => typeof item === 'string' && item.slice(0, 13) === hourKey);
}

function setValue(id, value, direction = 'auto') {
  const element = $(`#${id}`);
  if (element) {
    element.textContent = value;
    element.dir = direction;
  }
}
function percent(value, locale) {
  return numeric(value) === null ? '—' : `${formatNumber(value, { locale })}%`;
}
function quantity(value, unit, locale, digits = 0) {
  return numeric(value) === null ? '—' : `${formatNumber(value, { locale, digits })} ${unit}`;
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function drawTemperatureChart(hourly, startIndex, unit, locale, t) {
  const svg = $('#temperature-chart');
  svg.replaceChildren();
  const values = hourly.temperature_2m.slice(startIndex, startIndex + 24).map((value) => numeric(value));
  const valid = values.map((value, index) => value === null ? null : ({ index, value: unit === 'f' ? value * 9 / 5 + 32 : value })).filter(Boolean);
  if (valid.length < 2) {
    const empty = svgElement('text', { x: 450, y: 75, 'text-anchor': 'middle', class: 'chart-label', direction: locale === 'fa' ? 'rtl' : 'ltr', 'unicode-bidi': 'plaintext' });
    empty.textContent = t('chartUnavailable');
    svg.append(empty);
    return;
  }
  const width = 900, top = 15, bottom = 116, left = 13, right = 887;
  const min = Math.min(...valid.map((point) => point.value));
  const max = Math.max(...valid.map((point) => point.value));
  const range = Math.max(max - min, 1);
  const y = (value) => bottom - ((value - min) / range) * (bottom - top - 12);
  const x = (index) => left + index * (right - left) / Math.max(values.length - 1, 1);
  const points = valid.map((point) => `${x(point.index)},${y(point.value)}`).join(' ');
  const defs = svgElement('defs');
  const gradient = svgElement('linearGradient', { id: 'chart-fill', x1: '0', x2: '0', y1: '0', y2: '1' });
  gradient.append(svgElement('stop', { offset: '0%', 'stop-color': 'var(--blue)', 'stop-opacity': '.22' }), svgElement('stop', { offset: '100%', 'stop-color': 'var(--blue)', 'stop-opacity': '0' }));
  defs.append(gradient);
  svg.append(defs);
  [0, 1, 2].forEach((row) => svg.append(svgElement('line', { x1: left, x2: right, y1: top + row * 43, y2: top + row * 43, class: 'chart-grid' })));
  const areaPoints = `${x(valid[0].index)},${bottom} ${points} ${x(valid[valid.length - 1].index)},${bottom}`;
  svg.append(svgElement('polygon', { points: areaPoints, class: 'chart-area' }));
  svg.append(svgElement('polyline', { points, class: 'chart-line' }));
  const first = valid[0], last = valid[valid.length - 1];
  const hi = valid.reduce((a, b) => a.value > b.value ? a : b);
  const lo = valid.reduce((a, b) => a.value < b.value ? a : b);
  [[first, formatApiHour(hourly.time[startIndex], locale)], [hi, `${formatNumber(hi.value, { locale })}°`], [lo, `${formatNumber(lo.value, { locale })}°`], [last, formatApiHour(hourly.time[Math.min(startIndex + values.length - 1, hourly.time.length - 1)], locale)]].forEach(([point, label], index) => {
    if ((index === 0 || index === 3) && label !== '—') {
      const time = svgElement('text', { x: x(point.index), y: 139, 'text-anchor': index === 0 ? 'start' : 'end', class: 'chart-label', direction: 'ltr', 'unicode-bidi': 'plaintext' });
      time.textContent = label;
      svg.append(time);
    }
  });
  svg.append(svgElement('circle', { cx: x(hi.index), cy: y(hi.value), r: 3.5, class: 'chart-point' }));
  svg.append(svgElement('circle', { cx: x(lo.index), cy: y(lo.value), r: 3.5, class: 'chart-point' }));
  const high = svgElement('text', { x: Math.min(x(hi.index) + 8, right - 35), y: Math.max(y(hi.value) - 8, 13), class: 'chart-label', direction: 'ltr', 'unicode-bidi': 'plaintext' });
  high.textContent = `${formatNumber(hi.value, { locale })}°`;
  svg.append(high);
  const low = svgElement('text', { x: Math.min(x(lo.index) + 8, right - 35), y: Math.min(y(lo.value) + 15, bottom - 2), class: 'chart-label', direction: 'ltr', 'unicode-bidi': 'plaintext' });
  low.textContent = `${formatNumber(lo.value, { locale })}°`;
  svg.append(low);
}

function updateSunPosition(sunrise, sunset, timeZone, locale) {
  const track = $('#sun-track');
  if (!track) return;
  let currentMinutes;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(Date.now());
    currentMinutes = Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
  } catch { currentMinutes = apiClockMinutes(sunrise); }
  const sunriseMinutes = apiClockMinutes(sunrise), sunsetMinutes = apiClockMinutes(sunset);
  if (currentMinutes === null || sunriseMinutes === null || sunsetMinutes === null || sunsetMinutes <= sunriseMinutes) {
    track.style.setProperty('--sun-x', '50%');
    track.style.setProperty('--sun-y', '8px');
    track.classList.add('is-night');
    return;
  }
  const progress = Math.max(0, Math.min(1, (currentMinutes - sunriseMinutes) / (sunsetMinutes - sunriseMinutes)));
  const x = 7 + progress * 86;
  const y = 8 + Math.sin(progress * Math.PI) * 49;
  track.style.setProperty('--sun-x', `${x}%`);
  track.style.setProperty('--sun-y', `${y}px`);
  track.classList.toggle('is-night', currentMinutes < sunriseMinutes || currentMinutes > sunsetMinutes);
  track.setAttribute('aria-label', locale === 'fa' ? 'موقعیت خورشید در مسیر روز' : 'Current sun position along today’s daylight arc');
}

export function updateLiveClock(timeZone, locale, sunrise, sunset) {
  const clock = localClock(timeZone, locale);
  setValue('local-date', clock.date, 'auto');
  setValue('local-time', clock.time, 'auto');
  updateSunPosition(sunrise, sunset, timeZone, locale);
}

export function renderWeather(data, place, { lang, unit, windUnit, t }) {
  const { current, hourly, daily } = data;
  const index = atIndex(hourly, current.time);
  const near = (field) => index >= 0 ? hourly[field]?.[index] ?? null : null;
  const locale = lang;

  $('#city-name').textContent = place.name || t('myLocation');
  $('#city-name').dir = 'auto';
  $('#city-region').textContent = [place.admin1, place.admin2, place.country].filter((item, i, all) => item && all.indexOf(item) === i && item !== place.name).join(', ') || place.timezone || '';
  $('#city-region').dir = 'auto';
  $('#current-temp').dir = 'ltr';
  $('#current-temp').classList.add('bidi-isolate');
  $('#current-temp').replaceChildren(document.createTextNode(temperature(current.temperature_2m, unit, locale).replace(/°$/, '')));
  const degree = document.createElement('span'); degree.textContent = '°'; $('#current-temp').append(degree);
  setValue('current-condition', t('condition_', current.weather_code));
  setValue('feels-like', `${t('feelsLike')} ${temperature(current.apparent_temperature, unit, locale)}`);
  $('#hero-icon').innerHTML = weatherIcon(current.weather_code, { large: true });
  setValue('high-temp', temperature(daily.temperature_2m_max[0], unit, locale), 'ltr');
  setValue('low-temp', temperature(daily.temperature_2m_min[0], unit, locale), 'ltr');
  setValue('metric-humidity', percent(current.relative_humidity_2m, locale), 'ltr');
  setValue('metric-wind', windSpeed(current.wind_speed_10m, windUnit, locale));
  setValue('metric-direction', direction(current.wind_direction_10m, t, locale));
  setValue('metric-pressure', quantity(current.surface_pressure, lang === 'fa' ? 'هکتوپاسکال' : 'hPa', locale));
  setValue('metric-precipitation', quantity(current.precipitation, lang === 'fa' ? 'میلی‌متر' : 'mm', locale, 1));
  setValue('metric-rain', percent(near('precipitation_probability'), locale), 'ltr');
  setValue('metric-uv', uvDescription(near('uv_index'), t, locale));
  const visibility = near('visibility');
  setValue('metric-visibility', numeric(visibility) === null ? '—' : quantity(visibility / 1000, lang === 'fa' ? 'کیلومتر' : 'km', locale, 1));

  const startIndex = Math.max(0, index);
  drawTemperatureChart(hourly, startIndex, unit, locale, t);
  const strip = $('#hourly-strip');
  strip.replaceChildren();
  hourly.time.slice(startIndex, startIndex + 24).forEach((time, offset) => {
    const i = startIndex + offset;
    const item = document.createElement('article'); item.className = 'hour-item'; item.setAttribute('role', 'listitem');
    const timeLabel = document.createElement('span'); timeLabel.className = 'hour-time'; timeLabel.dir = 'auto'; timeLabel.textContent = offset === 0 ? t('now') : formatApiTime(time, locale);
    const icon = document.createElement('span'); icon.className = 'hour-icon';
    icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', t('condition_', hourly.weather_code[i]));
    icon.innerHTML = weatherIcon(hourly.weather_code[i], { precipitationProbability: hourly.precipitation_probability?.[i] });
    const temp = document.createElement('strong'); temp.className = 'hour-temp'; temp.dir = 'ltr'; temp.classList.add('bidi-isolate'); temp.textContent = temperature(hourly.temperature_2m[i], unit, locale);
    const rain = document.createElement('span'); rain.className = 'hour-rain'; rain.dir = 'ltr'; rain.classList.add('bidi-isolate'); rain.textContent = percent(hourly.precipitation_probability[i], locale);
    const wind = document.createElement('span'); wind.className = 'hour-wind'; wind.dir = 'auto';
    const speed = windSpeed(hourly.wind_speed_10m?.[i], windUnit, locale);
    const compass = direction(hourly.wind_direction_10m?.[i], t, locale).split(' ')[0];
    wind.textContent = `${compass === '—' ? '' : `${compass} `}${speed}`;
    item.append(timeLabel, icon, temp, rain, wind);
    strip.append(item);
  });

  const today = current.time.split('T')[0];
  const days = $('#daily-list'); days.replaceChildren();
  daily.time.slice(0, 7).forEach((date, i) => {
    const difference = dayDiff(today, date);
    const name = difference === 0 ? t('today') : difference === 1 ? t('tomorrow') : formatApiDate(date, locale, { weekday: 'short' });
    const row = document.createElement('div'); row.className = 'day-row'; row.setAttribute('role', 'listitem');
    const dayName = document.createElement('div'); dayName.className = 'day-name'; dayName.dir = 'auto'; dayName.append(document.createTextNode(name));
    const dateLabel = document.createElement('small'); dateLabel.dir = 'auto'; dateLabel.textContent = formatApiDate(date, locale, { month: 'short', day: 'numeric' }); dayName.append(dateLabel);
    const icon = document.createElement('span'); icon.className = 'day-icon';
    icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', t('condition_', daily.weather_code[i]));
    icon.innerHTML = weatherIcon(daily.weather_code[i], { precipitationProbability: daily.precipitation_probability_max?.[i] });
    const rain = document.createElement('span'); rain.className = 'day-rain'; rain.dir = 'auto'; rain.textContent = `${percent(daily.precipitation_probability_max[i], locale)} ${t('rain')}`;
    const temps = document.createElement('div'); temps.className = 'day-temperatures';
    const high = document.createElement('span'); high.className = 'max'; high.dir = 'ltr'; high.classList.add('bidi-isolate'); high.textContent = temperature(daily.temperature_2m_max[i], unit, locale);
    const low = document.createElement('span'); low.className = 'min'; low.dir = 'ltr'; low.classList.add('bidi-isolate'); low.textContent = temperature(daily.temperature_2m_min[i], unit, locale);
    temps.append(high, low); row.append(dayName, icon, rain, temps); days.append(row);
  });

  const sunrise = daily.sunrise[0], sunset = daily.sunset[0];
  setValue('sunrise-time', formatApiTime(sunrise, locale), 'ltr');
  setValue('sunset-time', formatApiTime(sunset, locale), 'ltr');
  const sunriseMinutes = apiClockMinutes(sunrise), sunsetMinutes = apiClockMinutes(sunset);
  const dayLength = sunriseMinutes === null || sunsetMinutes === null ? null : Math.max(0, sunsetMinutes - sunriseMinutes);
  setValue('daylight-duration', dayLength === null ? '—' : `${formatNumber(Math.floor(dayLength / 60), { locale })}${lang === 'fa' ? 'س' : 'h'} ${formatNumber(dayLength % 60, { locale })}${lang === 'fa' ? 'د' : 'm'}`);
  updateLiveClock(data.timezone, locale, sunrise, sunset);
}

export function renderAirQuality(data, { lang, t }) {
  const value = numeric(data?.us_aqi);
  const badge = $('#aqi-value');
  const meter = $('#aqi-meter-fill');
  badge.dir = 'ltr';
  badge.classList.add('bidi-isolate');
  if (value === null || value < 0) {
    badge.textContent = '—'; badge.removeAttribute('data-level'); meter.style.width = '0%';
    setValue('aqi-description', t('airQualityUnavailable'));
    setValue('aqi-pm25', '—'); setValue('aqi-pm10', '—'); setValue('aqi-ozone', '—');
    return;
  }
  const levels = value <= 50 ? ['good', 'aqiGood'] : value <= 100 ? ['moderate', 'aqiModerate'] : value <= 150 ? ['sensitive', 'aqiSensitive'] : value <= 200 ? ['unhealthy', 'aqiUnhealthy'] : value <= 300 ? ['very-unhealthy', 'aqiVeryUnhealthy'] : ['hazardous', 'aqiHazardous'];
  badge.dataset.level = levels[0];
  badge.textContent = formatNumber(value, { locale: lang });
  setValue('aqi-description', `${t(levels[1])} · ${t('aqi')}`, 'auto');
  meter.style.width = `${Math.min(100, value / 300 * 100)}%`;
  setValue('aqi-pm25', quantity(data.pm2_5, 'µg/m³', lang, 1), 'ltr');
  setValue('aqi-pm10', quantity(data.pm10, 'µg/m³', lang, 1), 'ltr');
  setValue('aqi-ozone', quantity(data.ozone, 'µg/m³', lang, 1), 'ltr');
}
