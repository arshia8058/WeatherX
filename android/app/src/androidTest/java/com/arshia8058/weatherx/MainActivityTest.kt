package com.arshia8058.weatherx

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivityTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun launchesNativeDashboardAndNavigation() {
        composeRule.onNodeWithText("WeatherX").assertExists()
        composeRule.onNodeWithContentDescription("Search cities").assertExists()
        composeRule.onNodeWithText("Favorites").assertExists()
        composeRule.onNodeWithText("Settings").assertExists()
    }
}
