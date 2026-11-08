package com.arshia8058.weatherx.data.api

import com.arshia8058.weatherx.domain.AirQuality
import com.arshia8058.weatherx.domain.City
import com.arshia8058.weatherx.domain.CurrentWeather
import com.arshia8058.weatherx.domain.DailyForecast
import com.arshia8058.weatherx.domain.HourlyForecast
import com.arshia8058.weatherx.domain.WeatherSnapshot

internal fun ForecastDto.toDomain(): WeatherSnapshot {
    val now = current ?: error("Forecast response is missing current conditions")
    val hours = hourly ?: error("Forecast response is missing hourly data")
    val days = daily ?: error("Forecast response is missing daily data")
    val times = hours.time.orEmpty()
    require(times.size >= 24) { "Forecast response contains fewer than 24 hours" }
    require(days.time.orEmpty().size >= 7) { "Forecast response contains fewer than 7 days" }
    val currentTime = now.time ?: error("Current observation has no timestamp")
    val currentHour = currentTime.take(13)
    val start = times.indexOfFirst { it.take(13) == currentHour }.takeIf { it >= 0 } ?: 0
    val hourlyForecast = times.drop(start).take(24).mapIndexed { offset, time ->
        val index = start + offset
        HourlyForecast(
            time = time,
            temperatureC = hours.temperatureC.at(index),
            precipitationProbability = hours.precipitationProbability.at(index).asPercent(),
            weatherCode = hours.weatherCode.at(index),
            windKmh = hours.windKmh.at(index),
            windDirectionDegrees = hours.windDirection.at(index).asDirection(),
            visibilityMeters = hours.visibility.at(index),
            uvIndex = hours.uvIndex.at(index),
        )
    }
    val dailyForecast = days.time.orEmpty().take(7).mapIndexed { index, date ->
        DailyForecast(
            date = date,
            weatherCode = days.weatherCode.at(index),
            highC = days.highC.at(index),
            lowC = days.lowC.at(index),
            precipitationProbability = days.precipitationProbability.at(index).asPercent(),
            sunrise = days.sunrise.at(index),
            sunset = days.sunset.at(index),
        )
    }
    return WeatherSnapshot(
        timezone = timezone?.takeIf { it.isNotBlank() } ?: "UTC",
        current = CurrentWeather(
            time = currentTime,
            temperatureC = now.temperatureC ?: error("Current temperature is missing"),
            feelsLikeC = now.feelsLikeC ?: now.temperatureC ?: error("Feels-like temperature is missing"),
            humidityPercent = now.humidity?.coerceIn(0, 100),
            precipitationMm = now.precipitation,
            weatherCode = now.weatherCode ?: error("Current weather condition is missing"),
            isDay = now.isDay?.let { it == 1 },
            windKmh = now.windKmh,
            windDirectionDegrees = now.windDirection.asDirection(),
            pressureHpa = now.pressureHpa,
        ),
        hourly = hourlyForecast,
        daily = dailyForecast,
    )
}

internal fun GeocodingResponseDto.toCities(): List<City> = results.orEmpty().mapNotNull { city ->
    val name = city.name?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
    val latitude = city.latitude?.takeIf { it.isFinite() && it in -90.0..90.0 } ?: return@mapNotNull null
    val longitude = city.longitude?.takeIf { it.isFinite() && it in -180.0..180.0 } ?: return@mapNotNull null
    City(name, latitude, longitude, city.country.orEmpty(), city.countryCode.orEmpty(), city.region.orEmpty(), city.timezone.orEmpty())
}.distinctBy(City::key).take(8)

internal fun AirQualityResponseDto.toAirQuality(targetTime: String): AirQuality? {
    val data = hourly ?: return null
    val times = data.time.orEmpty()
    if (times.isEmpty()) return null
    val exact = times.indexOfFirst { it.take(13) == targetTime.take(13) }
    val usableIndices = data.usAqi.orEmpty().indices.filter { data.usAqi?.getOrNull(it) != null }
    val index = when {
        exact >= 0 && data.usAqi?.getOrNull(exact) != null -> exact
        usableIndices.isNotEmpty() -> usableIndices.minByOrNull { kotlin.math.abs(indexDistance(times.getOrNull(it), targetTime)) }!!
        else -> exact.takeIf { it >= 0 } ?: 0
    }
    return AirQuality(
        usAqi = data.usAqi.at(index)?.toInt()?.coerceIn(0, 500),
        pm25 = data.pm25.at(index),
        pm10 = data.pm10.at(index),
        ozone = data.ozone.at(index),
        time = times.getOrNull(index),
    )
}

private fun indexDistance(time: String?, target: String): Long {
    fun epoch(value: String?): Long = runCatching {
        java.time.LocalDateTime.parse(value, java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"))
            .toEpochSecond(java.time.ZoneOffset.UTC)
    }.getOrDefault(0L)
    return epoch(time) - epoch(target)
}

private fun <T> List<T>?.at(index: Int): T? = this?.getOrNull(index)
