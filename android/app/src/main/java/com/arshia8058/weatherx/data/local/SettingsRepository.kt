package com.arshia8058.weatherx.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.arshia8058.weatherx.domain.AppSettings
import com.arshia8058.weatherx.domain.City
import com.arshia8058.weatherx.domain.TemperatureUnit
import com.arshia8058.weatherx.domain.ThemeChoice
import com.arshia8058.weatherx.domain.WindUnit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.settingsDataStore by preferencesDataStore(name = "weatherx_settings")

class SettingsRepository(context: Context, private val gson: Gson = Gson()) {
    private val store = context.applicationContext.settingsDataStore
    val settings: Flow<AppSettings> = store.data
        .catch { error -> if (error is IOException) emit(androidx.datastore.preferences.core.emptyPreferences()) else throw error }
        .map { preferences ->
            val language = preferences[LANGUAGE]?.takeIf { it == "en" || it == "fa" } ?: "en"
            val temperatureUnit = runCatching { TemperatureUnit.valueOf(preferences[TEMPERATURE_UNIT] ?: "CELSIUS") }.getOrDefault(TemperatureUnit.CELSIUS)
            val windUnit = runCatching { WindUnit.valueOf(preferences[WIND_UNIT] ?: "KMH") }.getOrDefault(WindUnit.KMH)
            val theme = runCatching { ThemeChoice.valueOf(preferences[THEME] ?: "SYSTEM") }.getOrDefault(ThemeChoice.SYSTEM)
            val city = preferences[SELECTED_CITY]?.let { runCatching { gson.fromJson(it, City::class.java) }.getOrNull() }
                ?.takeIf { it.latitude.isFinite() && it.longitude.isFinite() && it.latitude in -90.0..90.0 && it.longitude in -180.0..180.0 }
                ?: AppSettings().selectedCity
            AppSettings(language, temperatureUnit, windUnit, theme, city)
        }

    suspend fun setLanguage(language: String) = store.edit { it[LANGUAGE] = if (language == "fa") "fa" else "en" }
    suspend fun setTemperatureUnit(unit: TemperatureUnit) = store.edit { it[TEMPERATURE_UNIT] = unit.name }
    suspend fun setWindUnit(unit: WindUnit) = store.edit { it[WIND_UNIT] = unit.name }
    suspend fun setTheme(theme: ThemeChoice) = store.edit { it[THEME] = theme.name }
    suspend fun setSelectedCity(city: City) = store.edit { it[SELECTED_CITY] = gson.toJson(city) }

    private companion object {
        val LANGUAGE = stringPreferencesKey("language")
        val TEMPERATURE_UNIT = stringPreferencesKey("temperature_unit")
        val WIND_UNIT = stringPreferencesKey("wind_unit")
        val THEME = stringPreferencesKey("theme")
        val SELECTED_CITY = stringPreferencesKey("selected_city")
    }
}
