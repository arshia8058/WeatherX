package com.arshia8058.weatherx.domain

data class Coordinates(val latitude: Double, val longitude: Double)

interface LocationProvider {
    suspend fun currentLocation(): Coordinates
}
