<h1 align="center">WeatherX</h1>

<p align="center"><strong>Weather dashboards for the web and native Android.</strong></p>

<p align="center">
  <img src="./assets/weatherx-icon.svg" alt="WeatherX sun-and-cloud icon" width="144">
</p>

<p align="center">
  <a href="https://arshia8058.github.io/WeatherX/">Open the web app</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/arshia8058/WeatherX">GitHub repository</a>
</p>

## Downloads

### Web

Use WeatherX in a browser: **[Open the live web app](https://arshia8058.github.io/WeatherX/)**. No account or API key is required.

### Native Android

WeatherX for Android is being rebuilt as an independent Kotlin and Jetpack Compose app. A new native APK will be linked here after its Android build and emulator checks pass. **The existing `v1.0.0-android.1` preview is the retired WebView app; it is not the native Android app and should not be installed as the native release.**

## About WeatherX

The web app provides current weather and forecasts by city, in English and Persian (RTL). The Android app is a separate native client: it requests weather data directly from Open-Meteo and does not load the website inside a WebView. The existing HTML, CSS, and JavaScript web app remains independently buildable and deployable to GitHub Pages.

## Web app features

- Current conditions, temperature, feels-like temperature, and daily high/low.
- Hourly forecast with a temperature chart, conditions, rain probability, and wind.
- Seven-day forecast, city autocomplete, saved favorites, and optional browser geolocation.
- Humidity, precipitation, visibility, pressure, UV, sunrise/sunset, daylight visualization, and optional air quality.
- English and Persian interfaces, responsive layout, light/dark themes, Celsius/Fahrenheit, and selectable wind units.
- Automatic and manual refresh, local preferences, and offline weather cache.

## Native Android features

The native project is organized into Kotlin domain models and repository interfaces, Retrofit/Open-Meteo services, a Room cache and favorites database, DataStore settings, a location provider with runtime permissions, a ViewModel, and Jetpack Compose/Material 3 screens. It includes current conditions, hourly and seven-day forecasts, city search, favorites, optional device location, weather details and chart, air quality, English/Persian RTL, theme and unit choices, periodic foreground refresh, and offline cached-weather fallback.

Native build, lint, and emulator checks are configured in GitHub Actions. Do not treat an APK as a verified native release until those checks have succeeded and it is attached in the Android download section above.

## Technologies and data

- **Web:** HTML, CSS, JavaScript ES modules, and esbuild.
- **Android:** Kotlin, Jetpack Compose, Material 3, MVVM, Coroutines, Retrofit/OkHttp, Room, and DataStore.
- **Weather services:** Open-Meteo Forecast, Geocoding, and Air Quality APIs, called directly by each client.
- **Web deployment:** GitHub Pages.

The small Capacitor geolocation dependency is used by the web asset bundle only; it is not part of the Android application. The Android project contains no website WebView or Capacitor runtime.

| Service | Use | Documentation |
| --- | --- | --- |
| Forecast API | Current, hourly and daily weather, sunrise/sunset | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) |
| Geocoding API | City search suggestions | [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) |
| Air Quality API | US AQI, PM2.5, PM10, ozone | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) |

Weather remains usable when the optional air-quality request is unavailable. Internet access is needed to fetch new data; the Android app can display its locally cached forecast when refresh fails.

## Installation and development

### Web app

Requirements: Node.js 20 or newer and npm.

```bash
git clone https://github.com/arshia8058/WeatherX.git
cd WeatherX
npm ci
npm run build:web
python3 -m http.server 8080 --directory www
```

Open <http://localhost:8080>. Serve the files over HTTP rather than opening `index.html` directly; JavaScript modules and optional geolocation require a local web server. Run the web test suite with `npm test`.

### Native Android

Requirements: JDK 21, Android SDK Platform 36, and Android SDK Build Tools 36.0.0. No npm sync or website bundle is used to build the Android app.

```bash
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk` (relative to the repository root). To run the Compose launch test, start an Android emulator and use:

```bash
cd android
./gradlew connectedDebugAndroidTest
```

Debug builds are signed with the standard debug key for development and direct testing; they are not Play Store production builds. The app supports Android 8.0 (API 26) and newer.

## Project structure

```text
.
├── .github/workflows/
│   ├── android-apks.yml       # Native Android build, unit/lint, and emulator CI
│   ├── android-release.yml    # Manually publishes a tested native preview APK
│   └── pages.yml              # Web tests, build, and GitHub Pages deployment
├── android/
│   ├── app/src/main/          # Kotlin app, Compose UI, manifest, and resources
│   ├── app/src/test/          # Native mapper unit tests
│   ├── app/src/androidTest/   # Android emulator launch test
│   ├── gradlew
│   └── settings.gradle
├── assets/                    # Web icons, fonts, and images
├── css/style.css              # Web styles, themes, responsive layout, RTL
├── index.html                 # Web application
├── js/                         # Web API client, state, translation, and rendering
├── native/geolocation-bridge.js # Optional web geolocation bridge
├── scripts/build-web.mjs      # Builds static web assets in www/
├── tests/                     # Web test suite
├── android-release-version.txt
├── package.json
└── package-lock.json
```

## Deployment

The web app is deployed by `.github/workflows/pages.yml`. On updates to `main` (or a manual run), GitHub Actions installs npm dependencies, runs `npm test`, builds `www/`, and deploys those static assets. The Android CI and release workflows build the native Gradle project independently.

## Privacy

- Browser and Android geolocation are optional and requested only when the user selects the location control. Android asks for runtime location permission.
- Coordinates are sent to Open-Meteo to obtain the requested forecast; WeatherX does not operate an account system or weather server.
- Web preferences, favorites, and cache use browser storage. Android preferences use DataStore; weather cache and favorites use Room. The selected city, including a chosen device location, is saved locally.

## Roadmap

- Attach genuine web and Android screenshots.
- Prepare a keystore-backed signed Android production release if signing credentials are configured.
- Evaluate severe-weather alerts and their data source.

## Contributing

Bug reports, documentation improvements, and code contributions are welcome. Please open an issue before larger changes.

1. Fork the repository and create a focused branch.
2. Install web dependencies with `npm ci`.
3. Run `npm test`; for web asset changes, also run `npm run build:web`.
4. For Android changes, run the Gradle unit/lint/build checks and emulator tests when available.
5. Open a pull request describing the change and checks performed.

Do not commit generated `www/` or Android build output.

## License

There is currently no root-level `LICENSE` file, so the project has no specified project-wide open-source license. The bundled Vazirmatn font files have their own SIL Open Font License 1.1 notice at [`assets/fonts/OFL.txt`](./assets/fonts/OFL.txt); that font license does not license the rest of the project.

---

<p align="center">
  <strong>WeatherX</strong>
  &nbsp;·&nbsp;
  <a href="https://arshia8058.github.io/WeatherX/">Web app</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/arshia8058/WeatherX">GitHub repository</a>
</p>
