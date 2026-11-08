# WeatherX

A responsive bilingual (English / فارسی) weather dashboard built with vanilla HTML, CSS, and JavaScript. Live forecast and city-search data come directly from the free, keyless Open-Meteo Forecast and Geocoding APIs.

## Run locally

From this directory, run:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. Stop the server with `Ctrl+C`. Serve over HTTP (rather than opening `index.html` directly) so ES modules, local storage, and browser geolocation work as expected. The location button requires browser permission and a secure context; `localhost` is treated as secure by modern browsers.

## Features

- Live current conditions, hourly forecast, 7-day forecast, weather metrics, and daylight times.
- Open-Meteo geocoding search for cities worldwide.
- Optional browser geolocation, refresh, Celsius/Fahrenheit, and English/Persian with RTL support.
- Saved language, temperature unit, and last searched city (browser local storage).
- Loading indicators and clear errors for API, search, and location failures.
- Responsive layout for mobile, tablet, and desktop.

No API key, database, framework, package install, or build step is required. Weather API requests need an internet connection. Forecast requests set `timezone=auto` so daily and hourly timestamps follow the selected location's local time.
