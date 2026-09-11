package com.dbsound.app.presentation.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.dbsound.app.data.model.AlertNotification
import com.dbsound.app.presentation.ui.theme.DarkSlateCard
import com.dbsound.app.presentation.ui.theme.DarkSlateCardBorder
import com.dbsound.app.presentation.ui.theme.NoiseRed

@Composable
fun HighNoiseAlertModal(
    alert: AlertNotification,
    onDismiss: () -> Unit
) {
    var showInstructions by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
            border = androidx.compose.foundation.BorderStroke(2.dp, NoiseRed)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Warning Icon
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = NoiseRed,
                    modifier = Modifier.size(52.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "ALERTA!!",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = NoiseRed,
                    letterSpacing = 1.sp
                )

                Text(
                    text = "RUÍDO ALTO DETECTADO",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(16.dp))

                // dB Highlight Box
                Box(
                    modifier = Modifier
                        .background(Color(0xFF090D16), RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0x33EF4444), RoundedCornerShape(16.dp))
                        .padding(horizontal = 24.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "${alert.decibel.toInt()} dB",
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        color = NoiseRed,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Ruído elevado detectado no seu apartamento acima do limite legal configurado para este horário.",
                    fontSize = 13.sp,
                    color = Color(0xFFCBD5E1),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )

                if (showInstructions) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF090D16)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "Orientações Preventivas:",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "• Reduza o volume de televisores, caixas de som ou instrumentos.\n• Feche janelas para atenuar a propagação sonora.\n• Evite arrastar móveis ou calçados de sola rígida.",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8),
                                lineHeight = 16.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                    ) {
                        Text(text = "Ignorar", fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            if (!showInstructions) {
                                showInstructions = true
                            } else {
                                onDismiss()
                            }
                        },
                        modifier = Modifier.weight(1.3f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NoiseRed)
                    ) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (!showInstructions) "Baixar som" else "Entendido",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
