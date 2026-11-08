package com.arshia8058.weatherx.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "weather_cache")
data class WeatherCacheEntity(
    @PrimaryKey val cityKey: String,
    val payload: String,
    val updatedAt: Long,
)

@Entity(tableName = "favorite_cities")
data class FavoriteCityEntity(
    @PrimaryKey val cityKey: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val country: String,
    val countryCode: String,
    val region: String,
    val timezone: String,
    val savedAt: Long,
)
