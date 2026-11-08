package com.arshia8058.weatherx.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.arshia8058.weatherx.domain.ThemeChoice

private val LightColors = lightColorScheme(
    primary = Color(0xFF245FB6),
    onPrimary = Color.White,
    secondary = Color(0xFF087F8C),
    onSecondary = Color.White,
    tertiary = Color(0xFF7258B8),
    background = Color(0xFFF3F7FB),
    onBackground = Color(0xFF15253B),
    surface = Color.White,
    onSurface = Color(0xFF15253B),
    surfaceVariant = Color(0xFFE8EFF7),
    onSurfaceVariant = Color(0xFF53657D),
    error = Color(0xFFB33C32),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9FC4FF),
    onPrimary = Color(0xFF09264E),
    secondary = Color(0xFF76D9D1),
    onSecondary = Color(0xFF003735),
    tertiary = Color(0xFFC7B6FF),
    background = Color(0xFF0B1422),
    onBackground = Color(0xFFE7EEF8),
    surface = Color(0xFF152337),
    onSurface = Color(0xFFE7EEF8),
    surfaceVariant = Color(0xFF22334A),
    onSurfaceVariant = Color(0xFFB2C1D5),
    error = Color(0xFFFFB4A9),
)

@Composable
fun WeatherXTheme(theme: ThemeChoice, content: @Composable () -> Unit) {
    val dark = when (theme) {
        ThemeChoice.SYSTEM -> isSystemInDarkTheme()
        ThemeChoice.LIGHT -> false
        ThemeChoice.DARK -> true
    }
    MaterialTheme(colorScheme = if (dark) DarkColors else LightColors, content = content)
}
