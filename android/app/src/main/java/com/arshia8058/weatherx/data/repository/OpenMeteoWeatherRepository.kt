package com.arshia8058.weatherx.data.repository

import com.google.gson.Gson
import com.arshia8058.weatherx.data.api.ApiServices
import com.arshia8058.weatherx.data.api.toAirQuality
import com.arshia8058.weatherx.data.api.toCities
import com.arshia8058.weatherx.data.api.toDomain
import com.arshia8058.weatherx.data.local.FavoriteCityEntity
import com.arshia8058.weatherx.data.local.WeatherCacheEntity
import com.arshia8058.weatherx.data.local.WeatherDao
import com.arshia8058.weatherx.domain.AirQuality
import com.arshia8058.weatherx.domain.City
import com.arshia8058.weatherx.domain.WeatherRepository
import com.arshia8058.weatherx.domain.WeatherResult
import com.arshia8058.weatherx.domain.WeatherSnapshot
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

internal class OpenMeteoWeatherRepository(
    private val apis: ApiServices,
    private val dao: WeatherDao,
    private val gson: Gson = Gson(),
    private val clock: () -> Long = System::currentTimeMillis,
) : WeatherRepository {
    override suspend fun loadWeather(city: City, forceRefresh: Boolean): WeatherResult {
        val cached = dao.cachedWeather(city.key)
        if (!forceRefresh && cached != null && clock() - cached.updatedAt < WEATHER_CACHE_TTL) {
            return WeatherResult(gson.fromJson(cached.payload, WeatherSnapshot::class.java), cached.updatedAt, isStale = false)
        }
        return try {
            val snapshot = apis.forecast.forecast(city.latitude, city.longitude).toDomain()
            val now = clock()
            dao.saveWeather(WeatherCacheEntity(city.key, gson.toJson(snapshot), now))
            WeatherResult(snapshot, now, isStale = false)
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (error: Exception) {
            if (cached != null) {
                WeatherResult(gson.fromJson(cached.payload, WeatherSnapshot::class.java), cached.updatedAt, isStale = true)
            } else {
                throw WeatherLoadException(error)
            }
        }
    }

    override suspend fun searchCities(query: String, language: String): List<City> {
        val cleanQuery = query.trim().replace(Regex("\\s+"), " ")
        if (cleanQuery.length < 2) return emptyList()
        return apis.geocoding.search(cleanQuery, language = language).toCities()
    }

    override suspend fun loadAirQuality(city: City, targetTime: String): AirQuality? = try {
        apis.airQuality.airQuality(city.latitude, city.longitude).toAirQuality(targetTime)
    } catch (cancelled: CancellationException) {
        throw cancelled
    } catch (_: Exception) {
        null
    }

    override fun observeFavorites(): Flow<List<City>> = dao.observeFavorites().map { rows -> rows.map { it.toCity() } }

    override suspend fun isFavorite(city: City): Boolean = dao.isFavorite(city.key)

    override suspend fun addFavorite(city: City) {
        dao.saveFavorite(
            FavoriteCityEntity(
                cityKey = city.key,
                name = city.name,
                latitude = city.latitude,
                longitude = city.longitude,
                country = city.country,
                countryCode = city.countryCode,
                region = city.region,
                timezone = city.timezone,
                savedAt = clock(),
            ),
        )
    }

    override suspend fun removeFavorite(city: City) = dao.removeFavorite(city.key)

    private fun FavoriteCityEntity.toCity() = City(name, latitude, longitude, country, countryCode, region, timezone)

    companion object { const val WEATHER_CACHE_TTL = 10 * 60 * 1000L }
}

class WeatherLoadException(cause: Throwable) : Exception(cause.message ?: "Weather could not be loaded", cause)
