package com.arshia8058.weatherx.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.arshia8058.weatherx.domain.HourlyForecast
import kotlin.math.max

@Composable
fun WeatherIcon(code: Int?, modifier: Modifier = Modifier, foreground: Color = Color.White) {
    val sun = Color(0xFFFFD36E)
    val rain = Color(0xFF77B9FF)
    val snow = Color(0xFFAED8FF)
    val cloud = foreground
    val kind = when (code) {
        0 -> "clear sky"
        1, 2 -> "partly cloudy"
        3 -> "cloudy"
        45, 48 -> "fog"
        51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82 -> "rain"
        71, 73, 75, 77, 85, 86 -> "snow"
        95, 96, 99 -> "thunderstorm"
        else -> "weather"
    }
    Canvas(modifier.semantics { contentDescription = kind }) {
        val scale = size.minDimension / 100f
        val cloudColor = cloud
        val sunCenter = Offset(size.width * .67f, size.height * .35f)
        val sunRadius = 18f * scale
        if (code == 0 || code == 1 || code == 2 || code == null) {
            drawCircle(sun, sunRadius, sunCenter)
            for (i in 0 until 8) {
                rotate(i * 45f, sunCenter) {
                    drawLine(sun, Offset(sunCenter.x, sunCenter.y - 25f * scale), Offset(sunCenter.x, sunCenter.y - 32f * scale), 3f * scale, StrokeCap.Round)
                }
            }
        }
        if (code != 0) {
            val baseY = size.height * .70f
            drawRoundRect(cloudColor, Offset(size.width * .18f, baseY - 15f * scale), Size(size.width * .66f, 24f * scale), cornerRadius = androidx.compose.ui.geometry.CornerRadius(12f * scale))
            drawCircle(cloudColor, 16f * scale, Offset(size.width * .37f, baseY - 11f * scale))
            drawCircle(cloudColor, 23f * scale, Offset(size.width * .54f, baseY - 19f * scale))
            drawCircle(cloudColor, 15f * scale, Offset(size.width * .73f, baseY - 8f * scale))
            when {
                code in 95..99 -> {
                    val bolt = Path().apply {
                        moveTo(size.width * .56f, baseY + 2f * scale)
                        lineTo(size.width * .46f, baseY + 20f * scale)
                        lineTo(size.width * .54f, baseY + 20f * scale)
                        lineTo(size.width * .48f, baseY + 37f * scale)
                        lineTo(size.width * .64f, baseY + 15f * scale)
                        lineTo(size.width * .56f, baseY + 15f * scale)
                        close()
                    }
                    drawPath(bolt, sun)
                }
                code in 71..77 || code == 85 || code == 86 -> {
                    listOf(.38f, .55f, .71f).forEach { x -> drawCircle(snow, 2.6f * scale, Offset(size.width * x, baseY + 9f * scale)) }
                }
                code == 45 || code == 48 -> {
                    repeat(2) { index ->
                        val y = baseY + (7 + index * 8) * scale
                        drawLine(snow, Offset(size.width * .27f, y), Offset(size.width * .72f, y), 2.5f * scale, StrokeCap.Round)
                    }
                }
                code in 51..67 || code in 80..82 -> {
                    listOf(.40f, .57f, .73f).forEach { x ->
                        drawLine(rain, Offset(size.width * x, baseY + 5f * scale), Offset(size.width * (x - .04f), baseY + 15f * scale), 2.8f * scale, StrokeCap.Round)
                    }
                }
            }
        }
    }
}

@Composable
fun TemperatureChart(points: List<HourlyForecast>, modifier: Modifier = Modifier) {
    val primary = androidx.compose.material3.MaterialTheme.colorScheme.primary
    val grid = androidx.compose.material3.MaterialTheme.colorScheme.outlineVariant
    Box(modifier = modifier.fillMaxWidth().height(130.dp)) {
        Canvas(Modifier.fillMaxWidth().height(130.dp)) {
            val values = points.mapNotNull { it.temperatureC }
            if (values.size < 2) return@Canvas
            val minValue = values.minOrNull() ?: 0.0
            val maxValue = values.maxOrNull() ?: minValue
            val range = max(maxValue - minValue, 1.0)
            val left = 8f
            val right = size.width - 8f
            val top = 12f
            val bottom = size.height - 12f
            repeat(3) { row ->
                val y = top + (bottom - top) * row / 2f
                drawLine(grid.copy(alpha = .45f), Offset(left, y), Offset(right, y), 1.dp.toPx())
            }
            val chartPath = Path()
            val fillPath = Path()
            val step = (right - left) / (points.size - 1).coerceAtLeast(1)
            var validIndex = 0
            points.forEachIndexed { index, point ->
                val value = point.temperatureC ?: return@forEachIndexed
                val x = left + index * step
                val y = bottom - ((value - minValue) / range).toFloat() * (bottom - top)
                if (validIndex == 0) {
                    chartPath.moveTo(x, y)
                    fillPath.moveTo(x, bottom)
                    fillPath.lineTo(x, y)
                } else {
                    chartPath.lineTo(x, y)
                    fillPath.lineTo(x, y)
                }
                if (validIndex == values.size - 1) fillPath.lineTo(x, bottom)
                validIndex++
            }
            fillPath.close()
            drawPath(fillPath, primary.copy(alpha = .12f))
            drawPath(chartPath, primary, style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round, join = androidx.compose.ui.graphics.StrokeJoin.Round))
        }
    }
}
