package com.arshia8058.weatherx.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Air
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.WaterDrop
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.arshia8058.weatherx.domain.AirQuality
import com.arshia8058.weatherx.domain.AppSettings
import com.arshia8058.weatherx.domain.City
import com.arshia8058.weatherx.domain.DailyForecast
import com.arshia8058.weatherx.domain.HourlyForecast
import com.arshia8058.weatherx.domain.WeatherSnapshot
import com.arshia8058.weatherx.ui.components.TemperatureChart
import com.arshia8058.weatherx.ui.components.WeatherIcon
import com.arshia8058.weatherx.ui.formatDate
import com.arshia8058.weatherx.ui.formatLocalTime
import com.arshia8058.weatherx.ui.formatNumber
import com.arshia8058.weatherx.ui.formatTemperature
import com.arshia8058.weatherx.ui.formatWind
import com.arshia8058.weatherx.ui.tr
import com.arshia8058.weatherx.ui.viewmodel.WeatherUiState

@Composable
fun DashboardScreen(
    state: WeatherUiState,
    settings: AppSettings,
    onRetry: () -> Unit,
    onToggleFavorite: () -> Unit,
) {
    val lang = settings.language
    when {
        state.loading && state.weather == null -> LoadingScreen(lang)
        state.weather == null -> ErrorScreen(lang, onRetry)
        else -> WeatherDashboard(state, settings, state.weather, state.airQuality, onToggleFavorite)
    }
}

@Composable
private fun LoadingScreen(lang: String) {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator()
        Spacer(Modifier.height(16.dp))
        Text(tr(lang, "loading"), style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun ErrorScreen(lang: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Outlined.Cloud, null, Modifier.size(54.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(16.dp))
        Text(tr(lang, "weather_error"), style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(12.dp))
        TextButton(onClick = onRetry) { Text(tr(lang, "retry")) }
    }
}

@Composable
private fun WeatherDashboard(
    state: WeatherUiState,
    settings: AppSettings,
    weather: WeatherSnapshot,
    airQuality: AirQuality?,
    onToggleFavorite: () -> Unit,
) {
    val lang = settings.language
    val current = weather.current
    val cityTitle = if (state.city.name == "__current_location__") tr(lang, "my_location") else state.city.name
    val currentHour = weather.hourly.firstOrNull()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (state.errorKey != null) {
            item {
                AssistChip(
                    onClick = {},
                    label = { Text(tr(lang, state.errorKey)) },
                    leadingIcon = { Icon(Icons.Outlined.Cloud, null) },
                )
            }
        }
        item {
            CurrentWeatherCard(
                city = cityTitle,
                region = state.city.region.ifBlank { state.city.country },
                weather = weather,
                settings = settings,
                isFavorite = state.isFavorite,
                onToggleFavorite = onToggleFavorite,
                refreshing = state.refreshing,
            )
        }
        item {
            SectionTitle(tr(lang, "current"), tr(lang, "weather"))
            val currentMetrics = listOf(
                Metric(tr(lang, "humidity"), current.humidityPercent?.let { "${formatNumber(it, lang)}%" } ?: "—", Icons.Outlined.WaterDrop),
                Metric(tr(lang, "wind"), formatWind(current.windKmh, settings.windUnit, lang), Icons.Outlined.Air),
                Metric(tr(lang, "wind_direction"), com.arshia8058.weatherx.ui.windDirection(current.windDirectionDegrees, lang), Icons.Outlined.Explore),
                Metric(tr(lang, "pressure"), current.pressureHpa?.let { "${formatNumber(it, lang, 1)} hPa" } ?: "—", Icons.Outlined.Speed),
                Metric(tr(lang, "precipitation"), current.precipitationMm?.let { "${formatNumber(it, lang, 1)} mm" } ?: "—", Icons.Outlined.WaterDrop),
                Metric(tr(lang, "rain_chance"), currentHour?.precipitationProbability?.let { "${formatNumber(it, lang)}%" } ?: "—", Icons.Outlined.Cloud),
                Metric(tr(lang, "uv"), currentHour?.uvIndex?.let { formatNumber(it, lang, 1) } ?: "—", Icons.Outlined.WbSunny),
                Metric(tr(lang, "visibility"), currentHour?.visibilityMeters?.let { "${formatNumber(it / 1000.0, lang, 1)} km" } ?: "—", Icons.Outlined.Visibility),
            )
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                currentMetrics.chunked(2).forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        pair.forEach { metric -> MetricCard(metric, Modifier.weight(1f)) }
                        if (pair.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
        item {
            SectionTitle(tr(lang, "hourly"), tr(lang, "next24"))
            TemperatureChart(weather.hourly)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                items(weather.hourly, key = { it.time }) { hour -> HourCard(hour, settings, current.time) }
            }
        }
        item {
            SectionTitle(tr(lang, "week"), "7")
            ElevatedCard {
                Column(Modifier.padding(horizontal = 14.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    weather.daily.forEachIndexed { index, day -> DailyRow(day, index, settings) }
                }
            }
        }
        item { SunCard(weather, lang) }
        item { AirQualityCard(airQuality, lang) }
    }
}

@Composable
private fun CurrentWeatherCard(
    city: String,
    region: String,
    weather: WeatherSnapshot,
    settings: AppSettings,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    refreshing: Boolean,
) {
    val lang = settings.language
    val colors = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.extraLarge,
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
    ) {
        Column(
            Modifier.background(Brush.linearGradient(listOf(Color(0xFF1355A3), Color(0xFF4D93DC), Color(0xFF75B7E9))))
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(city, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (region.isNotBlank()) Text(region, color = Color.White.copy(alpha = .82f), style = MaterialTheme.typography.bodySmall)
                }
                IconButton(onClick = onToggleFavorite) {
                    Icon(Icons.Filled.Star, contentDescription = tr(lang, if (isFavorite) "remove_favorite" else "add_favorite"), tint = if (isFavorite) Color(0xFFFFD36E) else Color.White)
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(formatTemperature(weather.current.temperatureC, settings.temperatureUnit, lang), color = Color.White, fontSize = 58.sp, fontWeight = FontWeight.Light, lineHeight = 64.sp)
                    Text(com.arshia8058.weatherx.ui.weatherCondition(weather.current.weatherCode, lang), color = Color.White, style = MaterialTheme.typography.titleMedium)
                    Text("${tr(lang, "feels_like")} ${formatTemperature(weather.current.feelsLikeC, settings.temperatureUnit, lang)}", color = Color.White.copy(alpha = .86f), style = MaterialTheme.typography.bodyMedium)
                }
                WeatherIcon(weather.current.weatherCode, Modifier.size(112.dp))
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                val today = weather.daily.firstOrNull()
                Text(
                    "${formatLocalTime(weather.current.time, lang)}   ·   ${tr(lang, "high")} ${formatTemperature(today?.highC, settings.temperatureUnit, lang)}   ${tr(lang, "low")} ${formatTemperature(today?.lowC, settings.temperatureUnit, lang)}",
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                )
                if (refreshing) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
            }
        }
    }
}

private data class Metric(val label: String, val value: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@Composable
private fun MetricCard(metric: Metric, modifier: Modifier = Modifier) {
    ElevatedCard(modifier = modifier.height(82.dp), colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxSize().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(metric.icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Column {
                Text(metric.label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(metric.value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, trailing: String) {
    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(trailing, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun HourCard(hour: HourlyForecast, settings: AppSettings, currentTime: String) {
    val lang = settings.language
    ElevatedCard(modifier = Modifier.width(90.dp).height(152.dp)) {
        Column(
            Modifier.fillMaxSize().padding(vertical = 10.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(if (hour.time.take(13) == currentTime.take(13)) tr(lang, "now") else formatLocalTime(hour.time, lang, "h a", "HH:mm"), style = MaterialTheme.typography.labelMedium, maxLines = 1)
            WeatherIcon(hour.weatherCode, Modifier.size(48.dp), MaterialTheme.colorScheme.primary)
            Text(formatTemperature(hour.temperatureC, settings.temperatureUnit, lang), fontWeight = FontWeight.Bold)
            Text(hour.precipitationProbability?.let { "${formatNumber(it, lang)}%" } ?: "—", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall)
            Text(formatWind(hour.windKmh, settings.windUnit, lang), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
}

@Composable
private fun DailyRow(day: DailyForecast, index: Int, settings: AppSettings) {
    val lang = settings.language
    Row(Modifier.fillMaxWidth().height(68.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1.1f)) {
            Text(when (index) { 0 -> tr(lang, "today"); 1 -> tr(lang, "tomorrow"); else -> formatDate(day.date, lang) }, fontWeight = FontWeight.SemiBold)
            Text(formatDate(day.date, lang), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
        }
        WeatherIcon(day.weatherCode, Modifier.size(42.dp), MaterialTheme.colorScheme.primary)
        Text(day.precipitationProbability?.let { "${formatNumber(it, lang)}%" } ?: "—", modifier = Modifier.weight(.7f), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
        Text(formatTemperature(day.highC, settings.temperatureUnit, lang), fontWeight = FontWeight.Bold)
        Spacer(Modifier.width(8.dp))
        Text(formatTemperature(day.lowC, settings.temperatureUnit, lang), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SunCard(weather: WeatherSnapshot, lang: String) {
    val today = weather.daily.firstOrNull() ?: return
    ElevatedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            SectionTitle(tr(lang, "daylight"), formatLocalTime(weather.current.time, lang))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                SunTime(tr(lang, "sunrise"), today.sunrise, lang)
                SunTime(tr(lang, "sunset"), today.sunset, lang)
            }
            val daylightMinutes = runCatching {
                val rise = java.time.LocalDateTime.parse(today.sunrise).toLocalTime().toSecondOfDay() / 60
                val set = java.time.LocalDateTime.parse(today.sunset).toLocalTime().toSecondOfDay() / 60
                (set - rise + 1440) % 1440
            }.getOrDefault(0)
            Spacer(Modifier.height(6.dp))
            Text("${formatNumber(daylightMinutes / 60, lang)}h ${formatNumber(daylightMinutes % 60, lang)}m ${tr(lang, "daylight")}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SunTime(label: String, value: String?, lang: String) {
    Column {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
        Text(formatLocalTime(value, lang), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun AirQualityCard(air: AirQuality?, lang: String) {
    ElevatedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            SectionTitle(tr(lang, "air_quality"), tr(lang, "aqi"))
            if (air == null) {
                Text("—", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                val level = when {
                    air.usAqi == null -> "—"
                    air.usAqi <= 50 -> tr(lang, "good")
                    air.usAqi <= 100 -> tr(lang, "moderate")
                    air.usAqi <= 150 -> tr(lang, "sensitive")
                    air.usAqi <= 200 -> tr(lang, "unhealthy")
                    air.usAqi <= 300 -> tr(lang, "very_unhealthy")
                    else -> tr(lang, "hazardous")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(air.usAqi?.let { formatNumber(it, lang) } ?: "—", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(level, fontWeight = FontWeight.SemiBold)
                        Text(formatLocalTime(air.time, lang), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text("PM2.5  ${air.pm25?.let { formatNumber(it, lang, 1) } ?: "—"} µg/m³     PM10  ${air.pm10?.let { formatNumber(it, lang, 1) } ?: "—"} µg/m³     O₃  ${air.ozone?.let { formatNumber(it, lang, 1) } ?: "—"} µg/m³", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
