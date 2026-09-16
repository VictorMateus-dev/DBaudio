package com.dbsound.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dbsound.app.data.model.*
import com.dbsound.app.data.repository.NoiseRepositoryImpl
import com.dbsound.app.data.repository.OccurrenceRepositoryImpl
import com.dbsound.app.presentation.auth.LoginScreen
import com.dbsound.app.presentation.history.HistoryScreen
import com.dbsound.app.presentation.home.HomeScreen
import com.dbsound.app.presentation.occurrences.OccurrencesScreen
import com.dbsound.app.presentation.privacy.PrivacyScreen
import com.dbsound.app.presentation.profile.ProfileScreen
import com.dbsound.app.presentation.ui.theme.BrandBlue
import com.dbsound.app.presentation.ui.theme.DarkSlateBackground
import com.dbsound.app.presentation.ui.theme.DarkSlateCard
import kotlinx.coroutines.launch

sealed class Screen(val route: String, val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    object Home : Screen("home", "Início", Icons.Default.Home)
    object History : Screen("history", "Histórico", Icons.Default.DateRange)
    object Occurrences : Screen("occurrences", "Ocorrências", Icons.Default.Warning)
    object Profile : Screen("profile", "Perfil", Icons.Default.Person)
    object Privacy : Screen("privacy", "Privacidade", Icons.Default.Lock)
    object Login : Screen("login", "Login", Icons.Default.Lock)
}

@Composable
fun DBSoundApp() {
    val noiseRepo = remember { NoiseRepositoryImpl() }
    val occurrenceRepo = remember { OccurrenceRepositoryImpl() }
    val coroutineScope = rememberCoroutineScope()

    var currentScreen by remember { mutableStateOf<Screen>(Screen.Home) }
    var isLoggedIn by remember { mutableStateOf(true) }

    val user = remember {
        UserProfile(
            id = "bbbb2222-0000-0000-0000-000000000101",
            fullName = "João Silva",
            email = "morador101@dbsound.com",
            phone = "(11) 97777-0101",
            role = "resident",
            condominiumId = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
            apartmentId = "10100000-0000-0000-0000-000000000101",
            apartmentNumber = "101"
        )
    }

    val telemetry by noiseRepo.observeTelemetry(user.apartmentId ?: "").collectAsState(
        initial = NoiseTelemetry(
            currentDb = 48.0f,
            peakDb = 68.2f,
            averageDb = 46.5f,
            status = "normal",
            isDeviceOnline = true,
            lastRecordedAt = "Agora"
        )
    )

    var alerts by remember { mutableStateOf<List<AlertNotification>>(emptyList()) }
    var events by remember { mutableStateOf<List<NoiseEventItem>>(emptyList()) }
    var occurrences by remember { mutableStateOf<List<OccurrenceItem>>(emptyList()) }

    LaunchedEffect(Unit) {
        alerts = noiseRepo.getActiveAlerts(user.apartmentId ?: "")
        events = noiseRepo.getRecentEvents(user.apartmentId ?: "")
        occurrences = occurrenceRepo.getMyOccurrences()
    }

    if (!isLoggedIn) {
        LoginScreen(
            onLoginSuccess = {
                isLoggedIn = true
                currentScreen = Screen.Home
            }
        )
        return
    }

    val bottomNavScreens = listOf(Screen.Home, Screen.History, Screen.Occurrences, Screen.Profile)

    Scaffold(
        containerColor = DarkSlateBackground,
        bottomBar = {
            if (currentScreen != Screen.Privacy && currentScreen != Screen.Login) {
                NavigationBar(
                    containerColor = DarkSlateCard,
                    tonalElevation = 8.dp
                ) {
                    bottomNavScreens.forEach { screen ->
                        NavigationBarItem(
                            selected = currentScreen == screen,
                            onClick = { currentScreen = screen },
                            icon = { Icon(imageVector = screen.icon, contentDescription = screen.title) },
                            label = { Text(text = screen.title, fontSize = 11.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = BrandBlue,
                                selectedTextColor = BrandBlue,
                                unselectedIconColor = Color(0xFF64748B),
                                unselectedTextColor = Color(0xFF64748B),
                                indicatorColor = Color(0x1A0070F3)
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        androidx.compose.foundation.layout.Box(modifier = Modifier.padding(innerPadding)) {
            when (currentScreen) {
                Screen.Home -> HomeScreen(
                    telemetry = telemetry,
                    alerts = alerts,
                    userName = user.fullName,
                    apartmentNumber = user.apartmentNumber,
                    onNavigateToOccurrences = { currentScreen = Screen.Occurrences },
                    onAcknowledgeAlert = { alertId ->
                        coroutineScope.launch {
                            noiseRepo.acknowledgeAlert(alertId)
                            alerts = noiseRepo.getActiveAlerts(user.apartmentId ?: "")
                        }
                    }
                )
                Screen.History -> HistoryScreen(events = events)
                Screen.Occurrences -> OccurrencesScreen(
                    occurrences = occurrences,
                    onCreateOccurrence = { type, location, desc, anon ->
                        coroutineScope.launch {
                            occurrenceRepo.createOccurrence(type, location, desc, anon)
                            occurrences = occurrenceRepo.getMyOccurrences()
                        }
                    },
                    onAddComment = { occId, comment ->
                        coroutineScope.launch {
                            occurrenceRepo.addComment(occId, comment)
                        }
                    },
                    commentsMap = emptyMap()
                )
                Screen.Profile -> ProfileScreen(
                    user = user,
                    onNavigateToPrivacy = { currentScreen = Screen.Privacy },
                    onLogout = { isLoggedIn = false }
                )
                Screen.Privacy -> PrivacyScreen(
                    onBack = { currentScreen = Screen.Profile }
                )
                Screen.Login -> LoginScreen(onLoginSuccess = { isLoggedIn = true })
            }
        }
    }
}
