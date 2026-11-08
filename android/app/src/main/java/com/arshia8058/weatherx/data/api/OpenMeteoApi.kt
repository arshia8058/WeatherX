package com.arshia8058.weatherx.data.api

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

internal interface ForecastService {
    @GET("v1/forecast")
    suspend fun forecast(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("current") current: String = "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m,surface_pressure",
        @Query("hourly") hourly: String = "temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,visibility,uv_index",
        @Query("daily") daily: String = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        @Query("timezone") timezone: String = "auto",
        @Query("forecast_days") forecastDays: Int = 7,
        @Query("forecast_hours") forecastHours: Int = 24,
        @Query("wind_speed_unit") windSpeedUnit: String = "kmh",
    ): ForecastDto
}

internal interface GeocodingService {
    @GET("v1/search")
    suspend fun search(
        @Query("name") name: String,
        @Query("count") count: Int = 8,
        @Query("language") language: String,
        @Query("format") format: String = "json",
    ): GeocodingResponseDto
}

internal interface AirQualityService {
    @GET("v1/air-quality")
    suspend fun airQuality(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("hourly") hourly: String = "us_aqi,pm2_5,pm10,ozone",
        @Query("timezone") timezone: String = "auto",
        @Query("forecast_hours") forecastHours: Int = 24,
    ): AirQualityResponseDto
}

internal data class ApiServices(
    val forecast: ForecastService,
    val geocoding: GeocodingService,
    val airQuality: AirQualityService,
)

internal object OpenMeteoApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .build()

    private fun retrofit(baseUrl: String): Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    fun create(): ApiServices = ApiServices(
        forecast = retrofit("https://api.open-meteo.com/").create(ForecastService::class.java),
        geocoding = retrofit("https://geocoding-api.open-meteo.com/").create(GeocodingService::class.java),
        airQuality = retrofit("https://air-quality-api.open-meteo.com/").create(AirQualityService::class.java),
    )
}
