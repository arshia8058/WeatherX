import { getAirQuality, getForecast } from './api.js';
import { initSearch } from './search.js';
import { renderAirQuality, renderWeather, updateLiveClock } from './weather.js';
import { translations } from './translations.js';
import { $, $$, countryName, numeric, relativeTime } from './utils.js';

const KEYS = {
  language: 'weatherx-language', temperature: 'weatherx-unit', wind: 'weatherx-wind-unit',
  theme: 'weatherx-theme', place: 'weatherx-place', favorites: 'weatherx-favorites',
};
const DEFAULT_PLACE = {
  name: 'Stockholm', admin1: 'Stockholm County', country: 'Sweden', country_code: 'SE',
  latitude: 59.3293, longitude: 18.0686, timezone: 'Europe/Stockholm',
};
const POPULAR = [
  { id: 'london', name: 'London', country: 'United Kingdom', country_code: 'GB', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' },
  DEFAULT_PLACE,
  { id: 'tehran', name: 'Tehran', country: 'Iran', country_code: 'IR', latitude: 35.6892, longitude: 51.3890, timezone: 'Asia/Tehran' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', country_code: 'JP', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
];
const WIND_UNITS = ['kmh', 'ms', 'mph'];

function read(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function readJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ }
}
function validCoordinates(place) {
  const lat = numeric(place?.latitude), lon = numeric(place?.longitude);
  return lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
function cleanPlace(place) {
  return {
    name: String(place.name || ''), admin1: String(place.admin1 || ''), admin2: String(place.admin2 || ''),
    country: String(place.country || ''), country_code: String(place.country_code || ''),
    latitude: Number(place.latitude), longitude: Number(place.longitude), timezone: String(place.timezone || ''),
  };
}
function coordinateKey(place) { return `${Number(place.latitude).toFixed(4)},${Number(place.longitude).toFixed(4)}`; }

let language = read(KEYS.language, 'en');
if (!['en', 'fa'].includes(language)) language = 'en';
let temperatureUnit = read(KEYS.temperature, 'c');
if (!['c', 'f'].includes(temperatureUnit)) temperatureUnit = 'c';
let windUnit = read(KEYS.wind, 'kmh');
if (!WIND_UNITS.includes(windUnit)) windUnit = 'kmh';
let theme = read(KEYS.theme, document.documentElement.dataset.theme || 'light');
if (!['light', 'dark'].includes(theme)) theme = 'light';
let favorites = readJSON(KEYS.favorites, []);
if (!Array.isArray(favorites)) favorites = [];
favorites = favorites.filter(validCoordinates).slice(0, 12).map(cleanPlace);
let activePlace = null;
let pendingPlace = null;
let retryPlace = null;
let weatherData = null;
let airData = null;
let updatedAt = null;
let currentNotice = null;
let liveState = 'live';
let requestSequence = 0;
let requestController = null;

const t = (key, ...args) => {
  const dictionary = translations[language];
  if (key === 'condition_') return dictionary.conditions[numeric(args[0])] || dictionary.weatherUnknown;
  const value = dictionary[key];
  return typeof value === 'function' ? value(...args) : value ?? key;
};

function setLiveState(state) {
  liveState = state;
  const element = $('#live-status');
  element.classList.toggle('is-offline', state === 'offlineStatus' || state === 'cachedStatus' || state === 'serviceStatus');
  element.classList.toggle('is-loading', state === 'updatingStatus');
  $('#live-label').textContent = t(state);
}

function setNotice(key, kind = 'error') {
  currentNotice = { key, kind };
  const notice = $('#notice');
  notice.textContent = t(key);
  notice.classList.toggle('success', kind === 'success');
  notice.hidden = false;
}
function clearNotice() {
  currentNotice = null;
  $('#notice').hidden = true;
}
function updateStatusLabel() {
  if (!updatedAt) { $('#update-status').textContent = ''; return; }
  $('#update-status').textContent = `${t('updatedAt', relativeTime(updatedAt, language))} · ${t('automaticUpdate')}`;
  $('#update-status').dir = 'auto';
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c1524' : '#f3f7fb');
  const button = $('#theme-button');
  button.setAttribute('aria-label', t(theme === 'dark' ? 'lightMode' : 'darkMode'));
  button.title = t(theme === 'dark' ? 'lightMode' : 'darkMode');
}
function applyTranslations() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  document.title = language === 'fa' ? 'WeatherX — آب‌وهوا، با نگاهی تازه' : 'WeatherX — Weather, in focus';
  $$('[data-i18n]').forEach((element) => {
    const value = t(element.dataset.i18n);
    if (element.dataset.i18n === 'heading') element.innerHTML = value;
    else element.textContent = value;
  });
  $$('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  $('#city-search').dir = 'auto';
  $('#city-search').setAttribute('aria-label', t('searchLabel'));
  $('#search-results').setAttribute('aria-label', t('searchResultsLabel'));
  $('#hourly-strip').setAttribute('aria-label', t('hourlyForecast'));
  $('#language-button').textContent = language === 'en' ? 'فارسی' : 'English';
  $('#language-button').setAttribute('aria-label', language === 'en' ? 'Switch to Persian' : 'تغییر زبان به انگلیسی');
  $('#location-button').title = t('locationTitle'); $('#location-button').setAttribute('aria-label', t('locationTitle'));
  $('#share-button').title = t('shareTitle'); $('#share-button').setAttribute('aria-label', t('shareTitle'));
  $('#refresh-button').title = t('refreshTitle'); $('#refresh-button').setAttribute('aria-label', t('refreshTitle'));
  $('#live-label').textContent = t(liveState);
  $('#temperature-unit-group').setAttribute('aria-label', t('temperatureUnit'));
  $('#wind-unit-button').textContent = { kmh: 'km/h', ms: 'm/s', mph: 'mph' }[windUnit];
  $('#wind-unit-button').setAttribute('aria-label', `${t('changeWindUnit')} (${windUnit})`);
  $('#wind-unit-button').title = t('changeWindUnit');
  $$('[data-temp-unit]').forEach((button) => {
    const active = button.dataset.tempUnit === temperatureUnit;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  applyTheme();
  renderShortcuts();
  if (weatherData && activePlace) renderCurrentWeather();
  if (airData) renderAirQuality(airData, { lang: language, t });
  else renderAirQuality(null, { lang: language, t });
  if (loading) $('#loading').querySelector('span:last-child').textContent = t(weatherData ? 'updating' : 'loading');
  if (currentNotice) $('#notice').textContent = t(currentNotice.key);
  updateStatusLabel();
}

let loading = false;
function setLoading(value) {
  loading = value;
  $('#loading').hidden = !value;
  $('#loading').querySelector('span:last-child').textContent = t(weatherData ? 'updating' : 'loading');
  $('#refresh-button').disabled = value;
  $('#dashboard').classList.toggle('is-loading', value && Boolean(weatherData));
  $('#dashboard').setAttribute('aria-busy', String(value));
  if (!weatherData) $('#dashboard').hidden = true;
}

function placeForDisplay(place) {
  if (place.name !== '__geolocation__') {
    return { ...place, country: countryName(place.country_code, language) || place.country };
  }
  const region = place.timezone?.split('/').pop()?.replaceAll('_', ' ') || '';
  return { ...place, name: t('myLocation'), admin1: '', country: countryName(place.country_code, language) || region };
}
function renderCurrentWeather() {
  renderWeather(weatherData, placeForDisplay(activePlace), { lang: language, unit: temperatureUnit, windUnit, t });
  $('#dashboard').hidden = false;
  updateFavoriteButton();
  updateStatusLabel();
}
function updateFavoriteButton() {
  const button = $('#favorite-button');
  const isSaved = Boolean(activePlace && favorites.some((item) => coordinateKey(item) === coordinateKey(activePlace)));
  button.setAttribute('aria-pressed', String(isSaved));
  button.setAttribute('aria-label', t(isSaved ? 'removeFavorite' : 'addFavorite'));
  button.title = t(isSaved ? 'removeFavorite' : 'addFavorite');
}

function renderShortcuts() {
  const list = $('#city-shortcuts');
  if (!list) return;
  list.replaceChildren();
  POPULAR.forEach((place) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'shortcut-chip'; button.dir = 'auto';
    const localName = t('locations')?.[place.id] || place.name;
    button.textContent = `${localName} · ${t('countries')?.[place.country_code.toLowerCase()] || place.country}`;
    button.setAttribute('aria-label', `${localName}, ${t('countries')?.[place.country_code.toLowerCase()] || place.country}`);
    button.addEventListener('click', () => loadPlace(place));
    list.append(button);
  });
  if (favorites.length) {
    const label = document.createElement('span'); label.className = 'shortcut-label'; label.textContent = t('favorites');
    list.append(label);
    favorites.forEach((place) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'shortcut-chip favorite-chip'; button.dir = 'auto';
      const star = document.createElement('span'); star.className = 'chip-star'; star.textContent = '★'; star.setAttribute('aria-hidden', 'true');
      const localizedCountry = countryName(place.country_code, language) || place.country;
      const name = document.createElement('span'); name.textContent = [place.name, localizedCountry].filter(Boolean).join(', ');
      button.append(star, name);
      button.setAttribute('aria-label', `${place.name}, ${place.country}`);
      button.addEventListener('click', () => loadPlace(place));
      list.append(button);
    });
  }
}

function errorMessage(error) {
  if (error?.kind === 'invalid-data') return 'invalidData';
  if (error?.kind === 'timeout') return 'requestTimeout';
  if (error?.kind === 'service') return 'serviceError';
  if (error?.kind === 'http') return 'weatherError';
  if (error?.kind === 'network' && navigator.onLine === false) return 'offlineError';
  if (error?.kind === 'network') return 'networkError';
  return 'weatherError';
}

async function loadPlace(place, { force = false, announce = false, savePlace = true } = {}) {
  if (!validCoordinates(place)) { setNotice('weatherError'); return; }
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  const requestId = ++requestSequence;
  pendingPlace = cleanPlace(place);
  retryPlace = pendingPlace;
  clearNotice();
  setLiveState('updatingStatus');
  setLoading(true);
  try {
    const result = await getForecast({ ...pendingPlace, signal: controller.signal, force, persistCache: pendingPlace.name !== '__geolocation__' });
    if (requestId !== requestSequence) return;
    activePlace = pendingPlace;
    pendingPlace = null;
    retryPlace = null;
    weatherData = result.data;
    updatedAt = result.updatedAt;
    if (savePlace && activePlace.name !== '__geolocation__') save(KEYS.place, JSON.stringify(activePlace));
    $('#empty-state').hidden = true;
    $('#dashboard').hidden = false;
    setLoading(false);
    renderCurrentWeather();
    if (result.stale) { setLiveState('cachedStatus'); setNotice('staleForecast'); }
    else if (navigator.onLine === false) { setLiveState('offlineStatus'); setNotice('offlineError'); }
    else { setLiveState('live'); if (announce) setNotice('forecastUpdated', 'success'); }
    renderAirQuality(null, { lang: language, t });
    $('#aqi-description').textContent = t('loadingAir');
    const placeForAir = activePlace;
    getAirQuality({ ...placeForAir, signal: controller.signal }).then((air) => {
      if (requestId !== requestSequence) return;
      airData = air;
      renderAirQuality(airData, { lang: language, t });
    }).catch((error) => {
      if (error?.name === 'AbortError' || requestId !== requestSequence) return;
      airData = null;
      renderAirQuality(null, { lang: language, t });
    });
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== requestSequence) return;
    pendingPlace = null;
    setLoading(false);
    setLiveState(error?.kind === 'network' && navigator.onLine === false ? 'offlineStatus' : 'serviceStatus');
    setNotice(errorMessage(error));
    if (!weatherData) {
      $('#dashboard').hidden = true;
      $('#empty-state').hidden = false;
    }
  } finally {
    if (requestId === requestSequence) setLoading(false);
  }
}

const search = initSearch({ onSelect: (place) => loadPlace(place), getLanguage: () => language, t });

$('#language-button').addEventListener('click', () => {
  language = language === 'en' ? 'fa' : 'en'; save(KEYS.language, language); applyTranslations(); search.refresh();
});
$$('[data-temp-unit]').forEach((button) => button.addEventListener('click', () => {
  temperatureUnit = button.dataset.tempUnit; save(KEYS.temperature, temperatureUnit); applyTranslations();
}));
$('#wind-unit-button').addEventListener('click', () => {
  windUnit = WIND_UNITS[(WIND_UNITS.indexOf(windUnit) + 1) % WIND_UNITS.length];
  save(KEYS.wind, windUnit); applyTranslations();
});
$('#theme-button').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark'; save(KEYS.theme, theme); applyTheme();
});
$('#refresh-button').addEventListener('click', () => {
  if (activePlace) loadPlace(activePlace, { force: true, announce: true, savePlace: false });
  else if (pendingPlace) loadPlace(pendingPlace, { force: true });
  else loadPlace(DEFAULT_PLACE);
});
$('#retry-button').addEventListener('click', () => loadPlace(retryPlace || pendingPlace || activePlace || DEFAULT_PLACE, { force: true }));
$('#favorite-button').addEventListener('click', () => {
  if (!activePlace) return;
  const key = coordinateKey(activePlace);
  const exists = favorites.some((item) => coordinateKey(item) === key);
  favorites = exists ? favorites.filter((item) => coordinateKey(item) !== key) : [cleanPlace(placeForDisplay(activePlace)), ...favorites].slice(0, 12);
  save(KEYS.favorites, JSON.stringify(favorites));
  renderShortcuts(); updateFavoriteButton();
});
$('#share-button').addEventListener('click', async () => {
  if (!weatherData || !activePlace) { setNotice('shareUnavailable'); return; }
  const city = placeForDisplay(activePlace).name;
  const summary = `${city}: ${temperature(weatherData.current.temperature_2m, temperatureUnit, language)} — ${t('condition_', weatherData.current.weather_code)}. ${t('feelsLike')} ${temperature(weatherData.current.apparent_temperature, temperatureUnit, language)}.`;
  try {
    if (navigator.share) await navigator.share({ title: 'WeatherX', text: summary, url: location.href });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`${summary} ${location.href}`); setNotice('shareCopied', 'success'); }
    else setNotice('shareUnavailable');
  } catch (error) { if (error?.name !== 'AbortError') setNotice('shareUnavailable'); }
});

$('#location-button').addEventListener('click', () => {
  clearNotice();
  if (!('geolocation' in navigator)) { setNotice('geoUnsupported'); return; }
  requestController?.abort();
  requestSequence += 1;
  pendingPlace = null;
  setLoading(true);
  $('#loading').querySelector('span:last-child').textContent = t('geoLoading');
  navigator.geolocation.getCurrentPosition((position) => {
    const place = {
      name: '__geolocation__', latitude: position.coords.latitude, longitude: position.coords.longitude,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    loadPlace(place, { savePlace: false });
  }, (error) => {
    setLoading(false);
    setNotice(error.code === 1 ? 'geoDenied' : error.code === 2 ? 'geoUnavailable' : 'geoTimeout');
    if (!weatherData) $('#empty-state').hidden = false;
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
});

window.addEventListener('offline', () => { setLiveState('offlineStatus'); if (weatherData) setNotice('offlineError'); });
window.addEventListener('online', () => { if (activePlace) loadPlace(activePlace, { force: true }); });

applyTranslations();
const savedPlace = readJSON(KEYS.place, null);
const initialPlace = validCoordinates(savedPlace) ? cleanPlace(savedPlace) : DEFAULT_PLACE;
loadPlace(initialPlace);

window.setInterval(() => {
  if (weatherData && activePlace) {
    updateLiveClock(weatherData.timezone, language, weatherData.daily.sunrise[0], weatherData.daily.sunset[0]);
    updateStatusLabel();
  }
}, 30000);
window.setInterval(() => {
  if (activePlace && navigator.onLine !== false) loadPlace(activePlace, { force: true, savePlace: false });
}, 10 * 60 * 1000);
