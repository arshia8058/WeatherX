package com.arshia8058.weatherx.data.api

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class WeatherMapperTest {
    @Test
    fun mapsCurrentHourlyAndSevenDayForecast() {
        val snapshot = forecastDto().toDomain()
        assertEquals("Europe/Amsterdam", snapshot.timezone)
        assertEquals(18.5, snapshot.current.temperatureC, 0.0)
        assertEquals(20.2, snapshot.current.feelsLikeC, 0.0)
        assertEquals(72, snapshot.current.humidityPercent)
        assertEquals(24, snapshot.hourly.size)
        assertEquals("2025-05-01T12:00", snapshot.hourly.first().time)
        assertEquals(7, snapshot.daily.size)
        assertEquals(60, snapshot.daily.first().precipitationProbability)
    }

    @Test
    fun rejectsForecastWithoutEnoughHourlyData() {
        val short = forecastDto().copy(hourly = HourlyDto(time = listOf("2025-05-01T12:00"), temperatureC = null, precipitationProbability = null, weatherCode = null, windKmh = null, windDirection = null, visibility = null, uvIndex = null))
        assertThrows(IllegalArgumentException::class.java) { short.toDomain() }
    }

    @Test
    fun filtersInvalidGeocodingCoordinatesAndDeduplicates() {
        val valid = CityDto("Eindhoven", 51.44, 5.47, "Netherlands", "NL", "North Brabant", "Europe/Amsterdam")
        val result = GeocodingResponseDto(listOf(valid, valid, valid.copy(latitude = 91.0), CityDto("", 1.0, 2.0, null, null, null, null))).toCities()
        assertEquals(1, result.size)
        assertEquals("Eindhoven", result.single().name)
    }

    @Test
    fun matchesAirQualityToCurrentLocalHour() {
        val data = AirQualityResponseDto(
            AirQualityHourlyDto(
                time = listOf("2025-05-01T10:00", "2025-05-01T11:00", "2025-05-01T12:00"),
                usAqi = listOf(18.0, 24.0, 39.0),
                pm25 = listOf(2.0, 3.0, 4.0),
                pm10 = listOf(7.0, 8.0, 9.0),
                ozone = listOf(40.0, 42.0, 45.0),
            ),
        )
        val air = data.toAirQuality("2025-05-01T11:28")
        assertNotNull(air)
        assertEquals(24, air?.usAqi)
        assertEquals(3.0, air?.pm25 ?: 0.0, 0.0)
    }

    @Test
    fun returnsNullWhenAirQualityIsAbsent() {
        assertNull(AirQualityResponseDto(null).toAirQuality("2025-05-01T11:00"))
    }

    private fun forecastDto(): ForecastDto {
        val start = java.time.LocalDateTime.parse("2025-05-01T12:00")
        val times = (0 until 24).map { start.plusHours(it.toLong()).toString() }
        val dates = (1..7).map { day -> "2025-05-${day.toString().padStart(2, '0')}" }
        return ForecastDto(
            timezone = "Europe/Amsterdam",
            current = CurrentDto("2025-05-01T12:00", 18.5, 20.2, 72, 0.2, 2, 1, 11.0, 220.0, 1012.0),
            hourly = HourlyDto(times, List(24) { 17.0 + it }, List(24) { 60.0 }, List(24) { 2 }, List(24) { 10.0 }, List(24) { 180.0 }, List(24) { 10000.0 }, List(24) { 2.1 }),
            daily = DailyDto(dates, List(7) { 2 }, List(7) { 22.0 }, List(7) { 12.0 }, List(7) { 60.0 }, List(7) { "2025-05-01T06:15" }, List(7) { "2025-05-01T20:55" }),
        )
    }
}
