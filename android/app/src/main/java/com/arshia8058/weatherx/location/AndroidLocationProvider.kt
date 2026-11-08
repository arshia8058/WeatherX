package com.arshia8058.weatherx.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import android.os.Looper
import androidx.core.content.ContextCompat
import com.arshia8058.weatherx.domain.Coordinates
import com.arshia8058.weatherx.domain.LocationProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class AndroidLocationProvider(private val context: Context) : LocationProvider {
    @SuppressLint("MissingPermission")
    override suspend fun currentLocation(): Coordinates {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!hasFine && !hasCoarse) throw SecurityException("Location permission was not granted")

        val providers = buildList {
            if (hasFine) add(LocationManager.GPS_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
            if (hasFine) add(LocationManager.PASSIVE_PROVIDER)
        }
        val provider = providers.firstOrNull { runCatching { manager.isProviderEnabled(it) }.getOrDefault(false) }
            ?: throw LocationUnavailableException("Turn on location services and try again")

        val location = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            suspendCancellableCoroutine<Location> { continuation ->
                val cancellation = CancellationSignal()
                continuation.invokeOnCancellation { cancellation.cancel() }
                try {
                    manager.getCurrentLocation(provider, cancellation, context.mainExecutor) { result ->
                        if (result != null && continuation.isActive) continuation.resume(result)
                        else if (continuation.isActive) continuation.resumeWithException(LocationUnavailableException("No location fix was available"))
                    }
                } catch (error: SecurityException) {
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
            }
        } else {
            withContext(Dispatchers.Main.immediate) {
                suspendCancellableCoroutine<Location> { continuation ->
                    val listener = object : LocationListener {
                        override fun onLocationChanged(location: Location) {
                            if (continuation.isActive) continuation.resume(location)
                            manager.removeUpdates(this)
                        }
                        @Deprecated("Deprecated by Android") override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
                        override fun onProviderEnabled(provider: String) = Unit
                        override fun onProviderDisabled(provider: String) {
                            if (continuation.isActive) continuation.resumeWithException(LocationUnavailableException("Location provider was disabled"))
                            manager.removeUpdates(this)
                        }
                    }
                    continuation.invokeOnCancellation { manager.removeUpdates(listener) }
                    try {
                        manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                    } catch (error: Exception) {
                        if (continuation.isActive) continuation.resumeWithException(error)
                    }
                }
            }
        }
        return Coordinates(location.latitude, location.longitude)
    }
}

class LocationUnavailableException(message: String) : Exception(message)
