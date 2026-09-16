package com.dbsound.app.presentation.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dbsound.app.data.model.AlertNotification
import com.dbsound.app.data.model.NoiseTelemetry
import com.dbsound.app.presentation.alerts.HighNoiseAlertModal
import com.dbsound.app.presentation.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    telemetry: NoiseTelemetry,
    alerts: List<AlertNotification>,
    userName: String = "João Silva",
    apartmentNumber: String = "101",
    onNavigateToOccurrences: () -> Unit,
    onAcknowledgeAlert: (String) -> Unit
) {
    var activeModalAlert by remember { mutableStateOf<AlertNotification?>(null) }

    LaunchedEffect(alerts) {
        val unreadCritical = alerts.firstOrNull { it.severity == "critical" && !it.isRead }
        if (unreadCritical != null && activeModalAlert == null) {
            activeModalAlert = unreadCritical
        }
    }

    Scaffold(
        containerColor = DarkSlateBackground,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlateBackground),
                title = {
                    Column {
                        Text(
                            text = "Olá, $userName",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Meu apartamento: $apartmentNumber • Bloco A",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                    }
                },
                actions = {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(Color(0xFF0F172A))
                            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(20.dp))
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (telemetry.isDeviceOnline) NoiseGreen else Color.Gray)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (telemetry.isDeviceOnline) "ESP32 Online" else "Offline",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = androidx.compose.ui.graphics.SolidColor(
                            when (telemetry.status) {
                                "critical" -> NoiseRed
                                "warning" -> NoiseAmber
                                else -> DarkSlateCardBorder
                            }
                        )
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "NÍVEL ACÚSTICO ATUAL",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Box(
                            modifier = Modifier
                                .size(180.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF090D16))
                                .border(
                                    width = 6.dp,
                                    color = when (telemetry.status) {
                                        "critical" -> NoiseRed
                                        "warning" -> NoiseAmber
                                        else -> NoiseGreen
                                    },
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = String.format("%.1f", telemetry.currentDb),
                                    fontSize = 46.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    text = "dB SPL",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF64748B)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        val (statusText, statusBg, statusColor) = when (telemetry.status) {
                            "critical" -> Triple("Ruído Elevado", Color(0x33EF4444), NoiseRed)
                            "warning" -> Triple("Atenção", Color(0x33F59E0B), NoiseAmber)
                            else -> Triple("Normal", Color(0x3310B981), NoiseGreen)
                        }

                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = statusBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, statusColor.copy(alpha = 0.5f))
                        ) {
                            Text(
                                text = "Status: $statusText",
                                color = statusColor,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(text = "MÉDIA 24H", fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${telemetry.averageDb} dB",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(text = "ÚLTIMO PICO", fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${telemetry.peakDb} dB",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = NoiseAmber,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }

            item {
                Button(
                    onClick = onNavigateToOccurrences,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandBlue)
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Registrar Nova Ocorrência", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }

            item {
                Text(
                    text = "Alertas Recentes",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            if (alerts.isEmpty()) {
                item {
                    Text(
                        text = "Nenhum alerta recente registrado no seu apartamento.",
                        color = Color(0xFF64748B),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(vertical = 12.dp)
                    )
                }
            } else {
                items(alerts) { alert ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (alert.severity == "critical") Icons.Default.Warning else Icons.Default.Info,
                                contentDescription = null,
                                tint = if (alert.severity == "critical") NoiseRed else NoiseAmber,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = alert.title,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = alert.message,
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${alert.decibel.toInt()} dB",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (alert.severity == "critical") NoiseRed else NoiseAmber,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }

    activeModalAlert?.let { alert ->
        HighNoiseAlertModal(
            alert = alert,
            onDismiss = {
                onAcknowledgeAlert(alert.id)
                activeModalAlert = null
            }
        )
    }
}
