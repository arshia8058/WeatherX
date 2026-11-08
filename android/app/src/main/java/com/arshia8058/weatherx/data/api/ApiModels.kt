package com.arshia8058.weatherx.data.api

import com.google.gson.annotations.SerializedName

internal data class ForecastDto(
    @SerializedName("timezone") val timezone: String?,
    @SerializedName("current") val current: CurrentDto?,
    @SerializedName("hourly") val hourly: HourlyDto?,
    @SerializedName("daily") val daily: DailyDto?,
)

internal data class CurrentDto(
    val time: String?,
    @SerializedName("temperature_2m") val temperatureC: Double?,
    @SerializedName("apparent_temperature") val feelsLikeC: Double?,
    @SerializedName("relative_humidity_2m") val humidity: Int?,
    val precipitation: Double?,
    @SerializedName("weather_code") val weatherCode: Int?,
    @SerializedName("is_day") val isDay: Int?,
    @SerializedName("wind_speed_10m") val windKmh: Double?,
    @SerializedName("wind_direction_10m") val windDirection: Double?,
    @SerializedName("surface_pressure") val pressureHpa: Double?,
)

internal data class HourlyDto(
    val time: List<String>?,
    @SerializedName("temperature_2m") val temperatureC: List<Double?>?,
    @SerializedName("precipitation_probability") val precipitationProbability: List<Double?>?,
    @SerializedName("weather_code") val weatherCode: List<Int?>?,
    @SerializedName("wind_speed_10m") val windKmh: List<Double?>?,
    @SerializedName("wind_direction_10m") val windDirection: List<Double?>?,
    val visibility: List<Double?>?,
    @SerializedName("uv_index") val uvIndex: List<Double?>?,
)

internal data class DailyDto(
    val time: List<String>?,
    @SerializedName("weather_code") val weatherCode: List<Int?>?,
    @SerializedName("temperature_2m_max") val highC: List<Double?>?,
    @SerializedName("temperature_2m_min") val lowC: List<Double?>?,
    @SerializedName("precipitation_probability_max") val precipitationProbability: List<Double?>?,
    val sunrise: List<String?>?,
    val sunset: List<String?>?,
)

internal data class GeocodingResponseDto(val results: List<CityDto>?)

internal data class CityDto(
    val name: String?,
    val latitude: Double?,
    val longitude: Double?,
    val country: String?,
    @SerializedName("country_code") val countryCode: String?,
    @SerializedName("admin1") val region: String?,
    val timezone: String?,
)

internal data class AirQualityResponseDto(val hourly: AirQualityHourlyDto?)

internal data class AirQualityHourlyDto(
    val time: List<String>?,
    @SerializedName("us_aqi") val usAqi: List<Double?>?,
    @SerializedName("pm2_5") val pm25: List<Double?>?,
    val pm10: List<Double?>?,
    val ozone: List<Double?>?,
)
