package com.arshia8058.weatherx.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationCity
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.arshia8058.weatherx.domain.City
import com.arshia8058.weatherx.ui.tr
import com.arshia8058.weatherx.ui.viewmodel.WeatherUiState

@Composable
fun SearchScreen(
    state: WeatherUiState,
    language: String,
    onQueryChanged: (String) -> Unit,
    onSelectCity: (City) -> Unit,
) {
    val keyboard = LocalSoftwareKeyboardController.current
    val focusRequester = androidx.compose.runtime.remember { FocusRequester() }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = onQueryChanged,
            modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
            placeholder = { Text(tr(language, "search_hint")) },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            singleLine = true,
            shape = MaterialTheme.shapes.large,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { keyboard?.hide() }),
        )
        LazyColumn(Modifier.fillMaxSize().padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            when {
                state.searchLoading -> item {
                    Row(Modifier.fillMaxWidth().padding(20.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(12.dp))
                        Text(tr(language, "searching"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                state.searchError -> item { Text(tr(language, "search_error"), Modifier.padding(18.dp), color = MaterialTheme.colorScheme.error) }
                state.searchQuery.trim().length < 2 -> item { Text(tr(language, "search_min"), Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                state.searchResults.isEmpty() -> item { Text(tr(language, "no_results"), Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                else -> items(state.searchResults, key = { it.key }) { city -> CityResultRow(city, onClick = { keyboard?.hide(); onSelectCity(city) }) }
            }
        }
    }
}

@Composable
private fun CityResultRow(city: City, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.LocationCity, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(city.name, fontWeight = FontWeight.SemiBold)
                val detail = listOf(city.region, city.country).filter { it.isNotBlank() }.distinct().joinToString(", ")
                if (detail.isNotBlank()) Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (city.countryCode.isNotBlank()) Text(city.countryCode, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
