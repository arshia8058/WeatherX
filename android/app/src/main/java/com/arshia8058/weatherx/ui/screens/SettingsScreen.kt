package com.arshia8058.weatherx.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Thermostat
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.arshia8058.weatherx.domain.AppSettings
import com.arshia8058.weatherx.domain.TemperatureUnit
import com.arshia8058.weatherx.domain.ThemeChoice
import com.arshia8058.weatherx.domain.WindUnit
import com.arshia8058.weatherx.ui.tr

@Composable
fun SettingsScreen(
    settings: AppSettings,
    onLanguage: (String) -> Unit,
    onTemperatureUnit: (TemperatureUnit) -> Unit,
    onWindUnit: (WindUnit) -> Unit,
    onTheme: (ThemeChoice) -> Unit,
) {
    val lang = settings.language
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        SettingsGroup(tr(lang, "language"), Icons.Outlined.Language) {
            SettingOption(tr(lang, "english"), settings.language == "en") { onLanguage("en") }
            SettingOption(tr(lang, "persian"), settings.language == "fa") { onLanguage("fa") }
        }
        SettingsGroup(tr(lang, "temperature_unit"), Icons.Outlined.Thermostat) {
            SettingOption(tr(lang, "celsius"), settings.temperatureUnit == TemperatureUnit.CELSIUS) { onTemperatureUnit(TemperatureUnit.CELSIUS) }
            SettingOption(tr(lang, "fahrenheit"), settings.temperatureUnit == TemperatureUnit.FAHRENHEIT) { onTemperatureUnit(TemperatureUnit.FAHRENHEIT) }
        }
        SettingsGroup(tr(lang, "wind_unit"), Icons.Outlined.Speed) {
            SettingOption(tr(lang, "kmh"), settings.windUnit == WindUnit.KMH) { onWindUnit(WindUnit.KMH) }
            SettingOption(tr(lang, "ms"), settings.windUnit == WindUnit.MS) { onWindUnit(WindUnit.MS) }
            SettingOption(tr(lang, "mph"), settings.windUnit == WindUnit.MPH) { onWindUnit(WindUnit.MPH) }
        }
        SettingsGroup(tr(lang, "appearance"), Icons.Outlined.Palette) {
            SettingOption(tr(lang, "system"), settings.theme == ThemeChoice.SYSTEM) { onTheme(ThemeChoice.SYSTEM) }
            SettingOption(tr(lang, "light"), settings.theme == ThemeChoice.LIGHT) { onTheme(ThemeChoice.LIGHT) }
            SettingOption(tr(lang, "dark"), settings.theme == ThemeChoice.DARK) { onTheme(ThemeChoice.DARK) }
        }
        Text(tr(lang, "saved_settings"), modifier = Modifier.padding(horizontal = 4.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SettingsGroup(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, content: @Composable () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
            Row(Modifier.padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
                Text(title, Modifier.padding(start = 10.dp), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            content()
        }
    }
}

@Composable
private fun SettingOption(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onSelect).padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onSelect)
        Text(label, Modifier.padding(start = 6.dp), style = MaterialTheme.typography.bodyLarge)
    }
}
