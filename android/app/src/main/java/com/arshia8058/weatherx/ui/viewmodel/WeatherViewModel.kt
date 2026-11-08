package com.arshia8058.weatherx.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.arshia8058.weatherx.WeatherXApplication
import com.arshia8058.weatherx.domain.AirQuality
import com.arshia8058.weatherx.domain.AppSettings
import com.arshia8058.weatherx.domain.City
import com.arshia8058.weatherx.domain.LocationProvider
import com.arshia8058.weatherx.domain.TemperatureUnit
import com.arshia8058.weatherx.domain.ThemeChoice
import com.arshia8058.weatherx.domain.WeatherRepository
import com.arshia8058.weatherx.domain.WindUnit
import com.arshia8058.weatherx.domain.WeatherSnapshot
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.ZoneId

 data class WeatherUiState(
    val city: City = AppSettings().selectedCity,
    val weather: WeatherSnapshot? = null,
    val airQuality: AirQuality? = null,
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val stale: Boolean = false,
    val errorKey: String? = null,
    val isFavorite: Boolean = false,
    val favorites: List<City> = emptyList(),
    val searchQuery: String = "",
    val searchResults: List<City> = emptyList(),
    val searchLoading: Boolean = false,
    val searchError: Boolean = false,
    val locationLoading: Boolean = false,
)

class WeatherViewModel(
    private val repository: WeatherRepository,
    private val settingsRepository: com.arshia8058.weatherx.data.local.SettingsRepository,
    private val locationProvider: LocationProvider,
) : ViewModel() {
    private val _state = MutableStateFlow(WeatherUiState())
    val state: StateFlow<WeatherUiState> = _state.asStateFlow()

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private var weatherJob: Job? = null
    private var searchJob: Job? = null
    private var autoRefreshJob: Job? = null
    private var settingsLoaded = false
    private var requestSequence = 0
    private var searchSequence = 0

    init {
        viewModelScope.launch {
            settingsRepository.settings.collectLatest { value ->
                val oldCityKey = _settings.value.selectedCity.key
                _settings.value = value
                if (!settingsLoaded) {
                    settingsLoaded = true
                    loadWeather(value.selectedCity, forceRefresh = false)
                } else if (oldCityKey != value.selectedCity.key && _state.value.city.key != value.selectedCity.key) {
                    loadWeather(value.selectedCity, forceRefresh = false)
                }
            }
        }
        viewModelScope.launch {
            repository.observeFavorites().collectLatest { cities ->
                _state.value = _state.value.copy(
                    favorites = cities,
                    isFavorite = cities.any { it.key == _state.value.city.key },
                )
            }
        }
    }

    fun selectCity(city: City) {
        viewModelScope.launch { settingsRepository.setSelectedCity(city) }
        loadWeather(city, forceRefresh = false)
    }

    fun refresh() = loadWeather(_state.value.city, forceRefresh = true)

    private fun loadWeather(city: City, forceRefresh: Boolean) {
        weatherJob?.cancel()
        val sequence = ++requestSequence
        _state.value = _state.value.copy(
            city = city,
            loading = _state.value.weather == null,
            refreshing = _state.value.weather != null,
            stale = false,
            errorKey = null,
            locationLoading = false,
        )
        weatherJob = viewModelScope.launch {
            try {
                val result = repository.loadWeather(city, forceRefresh)
                if (sequence != requestSequence) return@launch
                _state.value = _state.value.copy(
                    city = city,
                    weather = result.snapshot,
                    loading = false,
                    refreshing = false,
                    stale = result.isStale,
                    errorKey = if (result.isStale) "offline_cached" else null,
                    isFavorite = repository.isFavorite(city),
                )
                val air = repository.loadAirQuality(city, result.snapshot.current.time)
                if (sequence == requestSequence) _state.value = _state.value.copy(airQuality = air)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                if (sequence == requestSequence) {
                    _state.value = _state.value.copy(
                        loading = false,
                        refreshing = false,
                        errorKey = if (_state.value.weather == null) "weather_error" else "refresh_error",
                    )
                }
            }
        }
    }

    fun updateSearchQuery(query: String) {
        searchJob?.cancel()
        val sequence = ++searchSequence
        _state.value = _state.value.copy(searchQuery = query, searchResults = emptyList(), searchError = false)
        if (query.trim().length < 2) {
            _state.value = _state.value.copy(searchLoading = false)
            return
        }
        _state.value = _state.value.copy(searchLoading = true)
        searchJob = viewModelScope.launch {
            delay(300)
            try {
                val results = repository.searchCities(query, _settings.value.language)
                if (sequence == searchSequence) _state.value = _state.value.copy(searchResults = results, searchLoading = false)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                if (sequence == searchSequence) _state.value = _state.value.copy(searchLoading = false, searchError = true)
            }
        }
    }

    fun toggleFavorite() {
        val city = _state.value.city
        viewModelScope.launch {
            if (repository.isFavorite(city)) repository.removeFavorite(city) else repository.addFavorite(city)
            _state.value = _state.value.copy(isFavorite = !repository.isFavorite(city))
        }
    }

    fun removeFavorite(city: City) {
        viewModelScope.launch { repository.removeFavorite(city) }
    }

    fun setLanguage(language: String) {
        viewModelScope.launch { settingsRepository.setLanguage(language) }
    }

    fun setTemperatureUnit(unit: TemperatureUnit) {
        viewModelScope.launch { settingsRepository.setTemperatureUnit(unit) }
    }

    fun setWindUnit(unit: WindUnit) {
        viewModelScope.launch { settingsRepository.setWindUnit(unit) }
    }

    fun setTheme(theme: ThemeChoice) {
        viewModelScope.launch { settingsRepository.setTheme(theme) }
    }

    fun useCurrentLocation() {
        viewModelScope.launch {
            _state.value = _state.value.copy(locationLoading = true, errorKey = null)
            try {
                val coordinates = locationProvider.currentLocation()
                val city = City(
                    name = CURRENT_LOCATION_KEY,
                    latitude = coordinates.latitude,
                    longitude = coordinates.longitude,
                    timezone = runCatching { ZoneId.systemDefault().id }.getOrDefault("UTC"),
                )
                settingsRepository.setSelectedCity(city)
                loadWeather(city, forceRefresh = true)
            } catch (error: SecurityException) {
                _state.value = _state.value.copy(locationLoading = false, errorKey = "location_permission")
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                _state.value = _state.value.copy(locationLoading = false, errorKey = "location_error")
            }
        }
    }

    fun showLocationPermissionDenied() {
        _state.value = _state.value.copy(locationLoading = false, errorKey = "location_permission")
    }

    fun startAutoRefresh() {
        if (autoRefreshJob?.isActive == true) return
        autoRefreshJob = viewModelScope.launch {
            while (true) {
                delay(AUTO_REFRESH_INTERVAL)
                loadWeather(_state.value.city, forceRefresh = true)
            }
        }
    }

    fun stopAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = null
    }

    override fun onCleared() {
        stopAutoRefresh()
        super.onCleared()
    }

    companion object {
        const val CURRENT_LOCATION_KEY = "__current_location__"
        const val AUTO_REFRESH_INTERVAL = 10 * 60 * 1000L
    }
}

class WeatherViewModelFactory(private val app: WeatherXApplication) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(WeatherViewModel::class.java)) {
            return WeatherViewModel(app.weatherRepository, app.settingsRepository, app.locationProvider) as T
        }
        error("Unknown ViewModel: ${modelClass.name}")
    }
}
