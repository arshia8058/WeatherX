package com.arshia8058.weatherx.ui

import com.arshia8058.weatherx.domain.TemperatureUnit
import com.arshia8058.weatherx.domain.WindUnit
import java.text.NumberFormat
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val en = mapOf(
    "app" to "WeatherX", "home" to "Weather", "favorites" to "Favorites", "settings" to "Settings", "now" to "Now",
    "search" to "Search cities", "search_hint" to "Search a city", "search_min" to "Type at least 2 characters",
    "searching" to "Searching cities…", "no_results" to "No cities found", "search_error" to "Could not search right now. Check your connection.",
    "current" to "Current conditions", "feels_like" to "Feels like", "high" to "High", "low" to "Low",
    "humidity" to "Humidity", "wind" to "Wind", "wind_direction" to "Direction", "pressure" to "Pressure",
    "precipitation" to "Precipitation", "rain_chance" to "Rain chance", "uv" to "UV index", "visibility" to "Visibility",
    "hourly" to "Hourly forecast", "next24" to "Next 24 hours", "week" to "7-day forecast", "today" to "Today", "tomorrow" to "Tomorrow",
    "sunrise" to "Sunrise", "sunset" to "Sunset", "daylight" to "Daylight", "air_quality" to "Air quality", "aqi" to "US AQI",
    "good" to "Good", "moderate" to "Moderate", "sensitive" to "Unhealthy for sensitive groups", "unhealthy" to "Unhealthy",
    "very_unhealthy" to "Very unhealthy", "hazardous" to "Hazardous", "pm25" to "PM2.5", "pm10" to "PM10", "ozone" to "Ozone",
    "loading" to "Loading forecast…", "refreshing" to "Updating…", "offline_cached" to "Offline — showing saved forecast",
    "weather_error" to "Weather could not be loaded. Check your connection and retry.", "refresh_error" to "Update failed. Showing the last available forecast.",
    "retry" to "Retry", "location" to "Use my location", "location_loading" to "Finding your location…",
    "location_permission" to "Location permission is needed to use your current location.", "location_error" to "Could not determine your location. Check device location settings.",
    "my_location" to "My location", "saved" to "Saved", "no_favorites" to "No favorite cities yet",
    "language" to "Language", "english" to "English", "persian" to "فارسی", "temperature_unit" to "Temperature",
    "celsius" to "Celsius (°C)", "fahrenheit" to "Fahrenheit (°F)", "wind_unit" to "Wind speed unit",
    "kmh" to "km/h", "ms" to "m/s", "mph" to "mph", "appearance" to "Appearance", "system" to "System",
    "light" to "Light", "dark" to "Dark", "saved_settings" to "Settings are saved on this device.",
    "remove_favorite" to "Remove from favorites", "add_favorite" to "Add to favorites", "refresh" to "Refresh forecast",
    "back" to "Back", "close" to "Close", "weather" to "Weather", "stale" to "Saved data",
)

private val fa = mapOf(
    "app" to "WeatherX", "home" to "هواشناسی", "favorites" to "مکان‌های دلخواه", "settings" to "تنظیمات", "now" to "اکنون",
    "search" to "جست‌وجوی شهر", "search_hint" to "نام شهر را بنویسید", "search_min" to "حداقل ۲ حرف وارد کنید",
    "searching" to "در حال جست‌وجوی شهرها…", "no_results" to "شهری پیدا نشد", "search_error" to "جست‌وجو انجام نشد؛ اتصال اینترنت را بررسی کنید.",
    "current" to "وضعیت فعلی", "feels_like" to "احساس می‌شود", "high" to "بیشینه", "low" to "کمینه",
    "humidity" to "رطوبت", "wind" to "باد", "wind_direction" to "جهت", "pressure" to "فشار هوا",
    "precipitation" to "بارش", "rain_chance" to "احتمال بارش", "uv" to "شاخص فرابنفش", "visibility" to "دید افقی",
    "hourly" to "پیش‌بینی ساعتی", "next24" to "۲۴ ساعت آینده", "week" to "پیش‌بینی ۷ روزه", "today" to "امروز", "tomorrow" to "فردا",
    "sunrise" to "طلوع", "sunset" to "غروب", "daylight" to "روشنایی روز", "air_quality" to "کیفیت هوا", "aqi" to "شاخص هوای آمریکا",
    "good" to "خوب", "moderate" to "متوسط", "sensitive" to "ناسالم برای گروه‌های حساس", "unhealthy" to "ناسالم",
    "very_unhealthy" to "بسیار ناسالم", "hazardous" to "خطرناک", "pm25" to "PM2.5", "pm10" to "PM10", "ozone" to "ازن",
    "loading" to "در حال دریافت پیش‌بینی…", "refreshing" to "در حال به‌روزرسانی…", "offline_cached" to "بدون اینترنت — آخرین پیش‌بینی ذخیره‌شده",
    "weather_error" to "دریافت هواشناسی ممکن نشد؛ اتصال را بررسی و دوباره تلاش کنید.", "refresh_error" to "به‌روزرسانی انجام نشد؛ آخرین پیش‌بینی نمایش داده می‌شود.",
    "retry" to "تلاش دوباره", "location" to "استفاده از موقعیت من", "location_loading" to "در حال پیدا کردن موقعیت…",
    "location_permission" to "برای استفاده از موقعیت فعلی، اجازهٔ دسترسی به مکان لازم است.", "location_error" to "موقعیت پیدا نشد؛ تنظیمات مکان‌یابی دستگاه را بررسی کنید.",
    "my_location" to "موقعیت من", "saved" to "ذخیره‌شده", "no_favorites" to "هنوز شهری به علاقه‌مندی‌ها اضافه نشده است",
    "language" to "زبان", "english" to "English", "persian" to "فارسی", "temperature_unit" to "دما",
    "celsius" to "سلسیوس (°C)", "fahrenheit" to "فارنهایت (°F)", "wind_unit" to "واحد سرعت باد",
    "kmh" to "کیلومتر/ساعت", "ms" to "متر/ثانیه", "mph" to "مایل/ساعت", "appearance" to "نمایش",
    "system" to "پیروی از دستگاه", "light" to "روشن", "dark" to "تیره", "saved_settings" to "تنظیمات روی همین دستگاه ذخیره می‌شوند.",
    "remove_favorite" to "حذف از علاقه‌مندی‌ها", "add_favorite" to "افزودن به علاقه‌مندی‌ها", "refresh" to "به‌روزرسانی پیش‌بینی",
    "back" to "بازگشت", "close" to "بستن", "weather" to "آب‌وهوا", "stale" to "دادهٔ ذخیره‌شده",
)

fun tr(language: String, key: String): String = (if (language == "fa") fa else en)[key] ?: en[key] ?: key

fun weatherCondition(code: Int, language: String): String {
    val key = when (code) {
        0 -> "clear"
        1 -> "mainly_clear"
        2 -> "partly_cloudy"
        3 -> "overcast"
        45, 48 -> "fog"
        51, 53, 55, 56, 57 -> "drizzle"
        61, 63, 65, 66, 67 -> "rain"
        71, 73, 75, 77, 85, 86 -> "snow"
        80, 81, 82 -> "showers"
        95, 96, 99 -> "thunderstorm"
        else -> "unknown"
    }
    val conditionsEn = mapOf("clear" to "Clear sky", "mainly_clear" to "Mainly clear", "partly_cloudy" to "Partly cloudy", "overcast" to "Overcast", "fog" to "Fog", "drizzle" to "Drizzle", "rain" to "Rain", "snow" to "Snow", "showers" to "Rain showers", "thunderstorm" to "Thunderstorm", "unknown" to "Unknown conditions")
    val conditionsFa = mapOf("clear" to "آسمان صاف", "mainly_clear" to "عمدتاً صاف", "partly_cloudy" to "نیمه‌ابری", "overcast" to "ابری", "fog" to "مه", "drizzle" to "نم‌نم باران", "rain" to "باران", "snow" to "برف", "showers" to "رگبار", "thunderstorm" to "رعدوبرق", "unknown" to "وضعیت نامشخص")
    return (if (language == "fa") conditionsFa else conditionsEn)[key] ?: key
}

fun formatNumber(value: Number?, language: String, decimals: Int = 0): String {
    if (value == null || !value.toDouble().isFinite()) return "—"
    val locale = if (language == "fa") Locale.forLanguageTag("fa-IR") else Locale.US
    return NumberFormat.getNumberInstance(locale).apply {
        minimumFractionDigits = if (decimals > 0) 1 else 0
        maximumFractionDigits = decimals
    }.format(value)
}

fun formatTemperature(celsius: Double?, unit: TemperatureUnit, language: String): String {
    if (celsius == null) return "—"
    val amount = if (unit == TemperatureUnit.FAHRENHEIT) celsius * 9.0 / 5.0 + 32.0 else celsius
    return "${formatNumber(amount, language)}°"
}

fun formatWind(kmh: Double?, unit: WindUnit, language: String): String {
    if (kmh == null) return "—"
    val (speed, unitLabel) = when (unit) {
        WindUnit.KMH -> kmh to tr(language, "kmh")
        WindUnit.MS -> kmh / 3.6 to tr(language, "ms")
        WindUnit.MPH -> kmh / 1.609344 to tr(language, "mph")
    }
    return "${formatNumber(speed, language, 1)} $unitLabel"
}

fun formatLocalTime(value: String?, language: String, patternEn: String = "h:mm a", patternFa: String = "HH:mm"): String {
    if (value.isNullOrBlank()) return "—"
    val date = runCatching { LocalDateTime.parse(value) }.getOrNull() ?: return "—"
    val locale = if (language == "fa") Locale.forLanguageTag("fa-IR") else Locale.US
    return date.format(DateTimeFormatter.ofPattern(if (language == "fa") patternFa else patternEn, locale))
}

fun formatDate(value: String, language: String): String {
    val date = runCatching { LocalDate.parse(value) }.getOrNull() ?: return value
    val locale = if (language == "fa") Locale.forLanguageTag("fa-IR") else Locale.US
    return date.format(DateTimeFormatter.ofPattern(if (language == "fa") "EEE, d MMM" else "EEE, MMM d", locale))
}

fun windDirection(degrees: Int?, language: String): String {
    if (degrees == null) return "—"
    val namesEn = listOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    val namesFa = listOf("شمال", "شمال‌شرق", "شرق", "جنوب‌شرق", "جنوب", "جنوب‌غرب", "غرب", "شمال‌غرب")
    val name = (if (language == "fa") namesFa else namesEn)[Math.round((degrees % 360) / 45f).toInt() % 8]
    return "$name · ${formatNumber(degrees, language)}°"
}
