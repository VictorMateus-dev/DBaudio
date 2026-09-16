package com.dbsound.app.presentation.history

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
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
import com.dbsound.app.data.model.NoiseEventItem
import com.dbsound.app.presentation.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    events: List<NoiseEventItem>
) {
    var selectedFilter by remember { mutableStateOf("Hoje") }
    val filters = listOf("Hoje", "7 dias", "30 dias")

    Scaffold(
        containerColor = DarkSlateBackground,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlateBackground),
                title = {
                    Text(
                        text = "Histórico de Eventos",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSlateCard, RoundedCornerShape(12.dp))
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    filters.forEach { filter ->
                        val isSelected = selectedFilter == filter
                        Button(
                            onClick = { selectedFilter = filter },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSelected) BrandBlue else Color.Transparent,
                                contentColor = if (isSelected) Color.White else Color(0xFF94A3B8)
                            ),
                            elevation = null
                        ) {
                            Text(text = filter, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Nível de Ruído x Tempo",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Pico Máx: 84.5 dB",
                                fontSize = 11.sp,
                                color = NoiseAmber,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(90.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            val simulatedBars = listOf(42, 45, 52, 48, 65, 78, 84, 60, 52, 46, 44, 48)
                            simulatedBars.forEach { db ->
                                val barHeight = ((db - 30f) / 70f * 80).dp
                                val barColor = when {
                                    db >= 80 -> NoiseRed
                                    db >= 70 -> NoiseAmber
                                    else -> NoiseGreen
                                }
                                Box(
                                    modifier = Modifier
                                        .width(16.dp)
                                        .height(barHeight)
                                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                        .background(barColor)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "12h", fontSize = 10.sp, color = Color(0xFF64748B))
                            Text(text = "16h", fontSize = 10.sp, color = Color(0xFF64748B))
                            Text(text = "20h", fontSize = 10.sp, color = Color(0xFF64748B))
                            Text(text = "Agora", fontSize = 10.sp, color = Color(0xFF64748B))
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Episódios Registrados (${events.size})",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            items(events) { event ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = if (event.severity == "critical") NoiseRed else NoiseAmber,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Sensor: ${event.sensorPosition}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                            Text(
                                text = event.startedAt,
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(text = "Pico", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text(
                                    text = "${event.peakDb} dB",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (event.severity == "critical") NoiseRed else NoiseAmber,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                            Column {
                                Text(text = "Média", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text(
                                    text = "${event.averageDb} dB",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                            Column {
                                Text(text = "Duração", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text(
                                    text = "${event.durationSeconds}s",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
