package com.dbsound.app.presentation.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkSlateBackground = Color(0xFF090D16)
val DarkSlateCard = Color(0xFF0F172A)
val DarkSlateCardBorder = Color(0xFF1E293B)

val BrandBlue = Color(0xFF0070F3)
val BrandBlueLight = Color(0xFF38BDF8)
val NoiseGreen = Color(0xFF10B981)
val NoiseAmber = Color(0xFFF59E0B)
val NoiseRed = Color(0xFFEF4444)

private val DarkColorScheme = darkColorScheme(
    primary = BrandBlue,
    secondary = BrandBlueLight,
    background = DarkSlateBackground,
    surface = DarkSlateCard,
    onPrimary = Color.White,
    onBackground = Color(0xFFF8FAFC),
    onSurface = Color(0xFFF8FAFC)
)

@Composable
fun DBSoundTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
