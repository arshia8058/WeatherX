package com.arshia8058.weatherx.domain

data class City(
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val country: String = "",
    val countryCode: String = "",
    val region: String = "",
    val timezone: String = "",
) {
    val key: String get() = "%.4f,%.4f".format(java.util.Locale.US, latitude, longitude)
    val displayName: String get() = listOf(name, region, country).filter { it.isNotBlank() }.distinct().joinToString(", ")
}

data class CurrentWeather(
    val time: String,
    val temperatureC: Double,
    val feelsLikeC: Double,
    val humidityPercent: Int?,
    val precipitationMm: Double?,
    val weatherCode: Int,
    val isDay: Boolean?,
    val windKmh: Double?,
    val windDirectionDegrees: Int?,
    val pressureHpa: Double?,
)

data class HourlyForecast(
    val time: String,
    val temperatureC: Double?,
    val precipitationProbability: Int?,
    val weatherCode: Int?,
    val windKmh: Double?,
    val windDirectionDegrees: Int?,
    val visibilityMeters: Double?,
    val uvIndex: Double?,
)

data class DailyForecast(
    val date: String,
    val weatherCode: Int?,
    val highC: Double?,
    val lowC: Double?,
    val precipitationProbability: Int?,
    val sunrise: String?,
    val sunset: String?,
)

data class AirQuality(
    val usAqi: Int?,
    val pm25: Double?,
    val pm10: Double?,
    val ozone: Double?,
    val time: String?,
)

data class WeatherSnapshot(
    val timezone: String,
    val current: CurrentWeather,
    val hourly: List<HourlyForecast>,
    val daily: List<DailyForecast>,
)

data class WeatherResult(val snapshot: WeatherSnapshot, val fetchedAt: Long, val isStale: Boolean)

enum class TemperatureUnit { CELSIUS, FAHRENHEIT }
enum class WindUnit { KMH, MS, MPH }
enum class ThemeChoice { SYSTEM, LIGHT, DARK }

data class AppSettings(
    val language: String = "en",
    val temperatureUnit: TemperatureUnit = TemperatureUnit.CELSIUS,
    val windUnit: WindUnit = WindUnit.KMH,
    val theme: ThemeChoice = ThemeChoice.SYSTEM,
    val selectedCity: City = City("Eindhoven", 51.4416, 5.4697, "Netherlands", "NL", "North Brabant", "Europe/Amsterdam"),
)

fun Double?.asPercent(): Int? = this?.takeIf { it.isFinite() }?.toInt()?.coerceIn(0, 100)
fun Double?.asDirection(): Int? = this?.takeIf { it.isFinite() && it in 0.0..360.0 }?.toInt()
