# WeatherX

WeatherX is a bilingual (English / فارسی), responsive weather dashboard built with vanilla HTML, CSS, and JavaScript. It uses Open-Meteo's free Forecast, Geocoding, and Air Quality APIs directly from the browser; no API key, database, framework, or application build step is required.

## Run locally

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>. Stop the server with `Ctrl+C`. Serve over HTTP rather than opening `index.html` directly so ES modules, local storage, and browser geolocation work correctly. Location permission is optional.

## Features

- Current conditions and 24-hour / 7-day forecasts, temperature trend chart, wind details, and a live solar arc.
- City autocomplete with cancellable requests, popular-city shortcuts, and saved favorites.
- English and Persian (RTL) interface, Light and Dark themes, Celsius/Fahrenheit, and km/h, m/s, or mph wind units.
- Optional geolocation, share action, 10-minute automatic refresh, and visible last-update time.
- Ten-minute weather cache with an explicit stale-data notice when a refresh cannot reach the API; recent searches and air-quality readings are cached in memory. Geolocation forecasts are memory-only unless the user explicitly saves that location as a favorite.
- Optional US AQI plus PM2.5, PM10, and ozone from Open-Meteo Air Quality. If that endpoint is unavailable, the rest of the weather dashboard continues to work.
- Validated API payloads, request timeouts, HTTP/network error states, and accessible loading, empty, and error states.

## Tests

With Node.js 20 or newer, run:

```bash
npm test
```

Tests use Node's built-in test runner; the site itself has no npm dependencies. Unit tests use mocked API responses to cover request construction, cache/offline fallback, malformed responses, cancellation, zero coordinates, air-quality data, and unit conversion.

## Deployment

The static asset paths are relative, so the app works at the project Pages path <https://arshia8058.github.io/WeatherX/>. GitHub Actions deploys the repository root when `main` is updated. Forecast data requires an internet connection to Open-Meteo; the last cached forecast can be shown during a network interruption.
