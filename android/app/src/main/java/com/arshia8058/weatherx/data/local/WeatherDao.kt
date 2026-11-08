package com.arshia8058.weatherx.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface WeatherDao {
    @Query("SELECT * FROM weather_cache WHERE cityKey = :cityKey LIMIT 1")
    suspend fun cachedWeather(cityKey: String): WeatherCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveWeather(entry: WeatherCacheEntity)

    @Query("SELECT * FROM favorite_cities ORDER BY savedAt DESC")
    fun observeFavorites(): Flow<List<FavoriteCityEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveFavorite(city: FavoriteCityEntity)

    @Query("DELETE FROM favorite_cities WHERE cityKey = :cityKey")
    suspend fun removeFavorite(cityKey: String)

    @Query("SELECT EXISTS(SELECT 1 FROM favorite_cities WHERE cityKey = :cityKey)")
    suspend fun isFavorite(cityKey: String): Boolean
}
