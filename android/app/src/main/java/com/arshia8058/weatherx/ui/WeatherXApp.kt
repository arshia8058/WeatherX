package com.arshia8058.weatherx.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.lifecycle.viewmodel.compose.viewModel
import com.arshia8058.weatherx.WeatherXApplication
import com.arshia8058.weatherx.domain.TemperatureUnit
import com.arshia8058.weatherx.domain.ThemeChoice
import com.arshia8058.weatherx.domain.WindUnit
import com.arshia8058.weatherx.ui.screens.DashboardScreen
import com.arshia8058.weatherx.ui.screens.FavoritesScreen
import com.arshia8058.weatherx.ui.screens.SearchScreen
import com.arshia8058.weatherx.ui.screens.SettingsScreen
import com.arshia8058.weatherx.ui.theme.WeatherXTheme
import com.arshia8058.weatherx.ui.viewmodel.WeatherViewModel
import com.arshia8058.weatherx.ui.viewmodel.WeatherViewModelFactory

private const val HOME = "home"
private const val FAVORITES = "favorites"
private const val SETTINGS = "settings"
private const val SEARCH = "search"

@Composable
fun WeatherXApp(application: WeatherXApplication, onWindowStyle: (Boolean) -> Unit) {
    val viewModel: WeatherViewModel = viewModel(factory = WeatherViewModelFactory(application))
    val state by viewModel.state.collectAsStateWithLifecycle()
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val isSystemDark = isSystemInDarkTheme()
    val dark = when (settings.theme) {
        ThemeChoice.SYSTEM -> isSystemDark
        ThemeChoice.LIGHT -> false
        ThemeChoice.DARK -> true
    }
    val direction = if (settings.language == "fa") LayoutDirection.Rtl else LayoutDirection.Ltr
    SideEffect { onWindowStyle(dark) }
    WeatherXTheme(settings.theme) {
        androidx.compose.runtime.CompositionLocalProvider(LocalLayoutDirection provides direction) {
            WeatherNavigation(viewModel, state, settings)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WeatherNavigation(
    viewModel: WeatherViewModel,
    state: com.arshia8058.weatherx.ui.viewmodel.WeatherUiState,
    settings: com.arshia8058.weatherx.domain.AppSettings,
) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route ?: HOME
    val lang = settings.language
    val context = LocalContext.current
    val locationLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
        val granted = results[Manifest.permission.ACCESS_FINE_LOCATION] == true || results[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) viewModel.useCurrentLocation() else viewModel.showLocationPermissionDenied()
    }
    val requestLocation: () -> Unit = {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (fine || coarse) viewModel.useCurrentLocation()
        else locationLauncher.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
    }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, viewModel) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_START) viewModel.startAutoRefresh()
            if (event == Lifecycle.Event.ON_STOP) viewModel.stopAutoRefresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            viewModel.stopAutoRefresh()
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(tr(lang, if (route == SEARCH) "search" else when (route) { FAVORITES -> "favorites"; SETTINGS -> "settings"; else -> "app" }), fontWeight = androidx.compose.ui.text.font.FontWeight.Bold) },
                navigationIcon = {
                    if (route == SEARCH) IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = tr(lang, "back"))
                    }
                },
                actions = {
                    when (route) {
                        HOME -> {
                            IconButton(onClick = { navController.navigate(SEARCH) }) { Icon(Icons.Outlined.Search, tr(lang, "search")) }
                            IconButton(onClick = requestLocation, enabled = !state.locationLoading) { Icon(Icons.Outlined.LocationOn, tr(lang, "location")) }
                            IconButton(onClick = viewModel::refresh, enabled = !state.refreshing) { Icon(Icons.Outlined.Refresh, tr(lang, "refresh")) }
                        }
                        SEARCH -> Unit
                        else -> Icon(Icons.Filled.Cloud, contentDescription = tr(lang, "app"), tint = MaterialTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = {
            if (route != SEARCH) NavigationBar {
                val items = listOf(HOME to Icons.Filled.Cloud, FAVORITES to Icons.Filled.Favorite, SETTINGS to Icons.Filled.Settings)
                items.forEach { (destination, icon) ->
                    NavigationBarItem(
                        selected = route == destination,
                        onClick = {
                            navController.navigate(destination) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(icon, contentDescription = tr(lang, destination)) },
                        label = { Text(tr(lang, destination)) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(navController, startDestination = HOME, modifier = Modifier.fillMaxSize().padding(padding)) {
            composable(HOME) {
                DashboardScreen(state, settings, onRetry = viewModel::refresh, onToggleFavorite = viewModel::toggleFavorite)
            }
            composable(SEARCH) {
                SearchScreen(
                    state = state,
                    language = lang,
                    onQueryChanged = viewModel::updateSearchQuery,
                    onSelectCity = { city -> viewModel.selectCity(city); navController.popBackStack() },
                )
            }
            composable(FAVORITES) {
                FavoritesScreen(state.favorites, lang, onSelect = { city -> viewModel.selectCity(city); navController.navigate(HOME) { popUpTo(HOME) { inclusive = true }; launchSingleTop = true } }, onRemove = viewModel::removeFavorite)
            }
            composable(SETTINGS) {
                SettingsScreen(
                    settings = settings,
                    onLanguage = viewModel::setLanguage,
                    onTemperatureUnit = viewModel::setTemperatureUnit,
                    onWindUnit = viewModel::setWindUnit,
                    onTheme = viewModel::setTheme,
                )
            }
        }
    }
}
