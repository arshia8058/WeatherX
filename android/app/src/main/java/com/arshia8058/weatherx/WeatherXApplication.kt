package com.arshia8058.weatherx

import android.app.Application
import androidx.room.Room
import com.google.gson.Gson
import com.arshia8058.weatherx.data.api.OpenMeteoApi
import com.arshia8058.weatherx.data.local.SettingsRepository
import com.arshia8058.weatherx.data.local.WeatherDatabase
import com.arshia8058.weatherx.data.repository.OpenMeteoWeatherRepository
import com.arshia8058.weatherx.domain.WeatherRepository
import com.arshia8058.weatherx.location.AndroidLocationProvider

class WeatherXApplication : Application() {
    val gson: Gson by lazy { Gson() }
    val database: WeatherDatabase by lazy {
        Room.databaseBuilder(applicationContext, WeatherDatabase::class.java, "weatherx.db").build()
    }
    val weatherRepository: WeatherRepository by lazy {
        OpenMeteoWeatherRepository(OpenMeteoApi.create(), database.weatherDao(), gson)
    }
    val settingsRepository: SettingsRepository by lazy { SettingsRepository(applicationContext, gson) }
    val locationProvider by lazy { AndroidLocationProvider(applicationContext) }
}
