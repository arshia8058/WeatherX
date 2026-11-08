package com.arshia8058.weatherx.domain

import kotlinx.coroutines.flow.Flow

interface WeatherRepository {
    suspend fun loadWeather(city: City, forceRefresh: Boolean = false): WeatherResult
    suspend fun searchCities(query: String, language: String): List<City>
    suspend fun loadAirQuality(city: City, targetTime: String): AirQuality?
    fun observeFavorites(): Flow<List<City>>
    suspend fun isFavorite(city: City): Boolean
    suspend fun addFavorite(city: City)
    suspend fun removeFavorite(city: City)
}
