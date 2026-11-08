# WeatherX

WeatherX is a bilingual (English / فارسی), responsive weather dashboard built with vanilla HTML, CSS, and JavaScript. It uses Open-Meteo's free Forecast, Geocoding, and Air Quality APIs directly; no API key or application server is required. The same web app can run on GitHub Pages and inside a native Android WebView app built with Capacitor.

## Run locally

```bash
npm ci
npm run build:web
python3 -m http.server 8080 --directory www
```

Open <http://localhost:8080>. Stop the server with `Ctrl+C`. Build the web assets first so the Capacitor geolocation bridge is present. The source app uses relative URLs and can also be served from the repository root during web-only development.

## Features

- Current conditions and 24-hour / 7-day forecasts, a temperature trend chart, wind details, and a live solar arc; the page greeting adapts to local daylight, including polar-day/night flags.
- Keyboard-accessible city autocomplete with cancellable requests, popular-city shortcuts, and saved favorites.
- English and Persian (RTL) interface with bundled Vazirmatn Arabic-script fonts, isolated mixed-direction labels, Light and Dark themes, Celsius/Fahrenheit, and km/h, m/s, or mph wind units.
- Optional geolocation, share action, 10-minute automatic refresh, and visible last-update time.
- Ten-minute weather cache with an explicit stale-data notice when a refresh cannot reach the API; recent searches and air-quality readings are cached in memory. Geolocation forecasts are memory-only unless the user explicitly saves that location as a favorite.
- Optional US AQI plus PM2.5, PM10, and ozone from Open-Meteo Air Quality, aligned to the forecast hour and labeled with its reading time. If that endpoint is unavailable, the rest of the weather dashboard continues to work.
- Validated API payloads, request timeouts, HTTP/network error states, and accessible loading, empty, and error states.

## Android APKs

The Capacitor Android wrapper packages the web assets locally, so the interface itself launches without downloading the site. Weather and air-quality data still require internet access. Device location is optional and requested only after the user taps the location button.

Build both APK variants locally with Node.js 22+, JDK 21, and Android SDK Platform 36 installed:

```bash
npm ci
npm run android:debug
```

The outputs are:

- `android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk` — smaller APK for 64-bit ARM Android devices.
- `android/app/build/outputs/apk/debug/app-universal-debug.apk` — one APK for ARM and x86 Android devices; larger because it includes multiple ABIs.

These are debug-signed APKs for testing and direct installation, not Play Store release packages. The `Build WeatherX Android APKs` GitHub Actions workflow also uploads both APKs as a downloadable artifact when manually run or when a pull request targets `main`. The application id is `com.arshia8058.weatherx`.

## Tests

With Node.js 20 or newer, run:

```bash
npm test
```

Tests use Node's built-in test runner and mocked API responses to cover request construction, bounded cache/offline fallback, timestamp and range validation, cancellation, zero coordinates, forecast-hour air-quality alignment, translation parity, and unit conversion. The bundled Vazirmatn font files are licensed under SIL OFL 1.1; see `assets/fonts/OFL.txt`.

## Deployment

The static asset paths are relative, so the app works at the project Pages path <https://arshia8058.github.io/WeatherX/>. GitHub Actions builds the web assets and deploys the site when `main` is updated. Forecast data requires an internet connection to Open-Meteo; the last cached forecast can be shown during a network interruption.
