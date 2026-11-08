package com.arshia8058.weatherx.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [WeatherCacheEntity::class, FavoriteCityEntity::class], version = 1, exportSchema = true)
abstract class WeatherDatabase : RoomDatabase() {
    abstract fun weatherDao(): WeatherDao
}
