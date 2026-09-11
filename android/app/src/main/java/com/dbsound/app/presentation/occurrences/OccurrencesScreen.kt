package com.dbsound.app.presentation.occurrences

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dbsound.app.data.model.OccurrenceCommentItem
import com.dbsound.app.data.model.OccurrenceItem
import com.dbsound.app.presentation.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OccurrencesScreen(
    occurrences: List<OccurrenceItem>,
    onCreateOccurrence: (type: String, location: String, description: String, isAnonymous: Boolean) -> Unit,
    onAddComment: (occurrenceId: String, comment: String) -> Unit,
    commentsMap: Map<String, List<OccurrenceCommentItem>>
) {
    var selectedTab by remember { mutableStateOf(0) } // 0 = Minhas Ocorrências, 1 = Nova Ocorrência
    var selectedOccurrenceForDetails by remember { mutableStateOf<OccurrenceItem?>(null) }

    // Form states
    var type by remember { mutableStateOf("Música Alta / Som Excessivo") }
    var location by remember { mutableStateOf("Apartamento 202") }
    var description by remember { mutableStateOf("") }
    var isAnonymous by remember { mutableStateOf(false) }

    var newCommentText by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkSlateBackground,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlateBackground),
                title = {
                    Text(
                        text = "Ocorrências & Relatos",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // Tab Selector
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = DarkSlateCard,
                contentColor = BrandBlue,
                divider = {}
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Minhas Ocorrências", fontSize = 13.sp, fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Nova Ocorrência", fontSize = 13.sp, fontWeight = FontWeight.Bold) }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (selectedTab == 0) {
                // List of Occurrences
                if (occurrences.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Você não possui ocorrências registradas.", color = Color(0xFF64748B), fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(occurrences) { occ ->
                            Card(
                                onClick = { selectedOccurrenceForDetails = occ },
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
                                        Text(text = occ.type, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        val (statusBg, statusColor) = when (occ.status) {
                                            "aberta" -> Pair(Color(0x33F59E0B), NoiseAmber)
                                            "em análise" -> Pair(Color(0x330070F3), BrandBlue)
                                            "resolvida" -> Pair(Color(0x3310B981), NoiseGreen)
                                            else -> Pair(Color(0x3364748B), Color(0xFF94A3B8))
                                        }
                                        Surface(shape = RoundedCornerShape(8.dp), color = statusBg) {
                                            Text(
                                                text = occ.status.uppercase(),
                                                color = statusColor,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = occ.description,
                                        fontSize = 12.sp,
                                        color = Color(0xFFCBD5E1),
                                        maxLines = 2
                                    )

                                    Spacer(modifier = Modifier.height(12.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "Local: ${occ.location}", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                        Text(text = occ.occurredAt, fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // New Occurrence Form
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        OutlinedTextField(
                            value = type,
                            onValueChange = { type = it },
                            label = { Text("Tipo de Ocorrência") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandBlue,
                                unfocusedBorderColor = DarkSlateCardBorder,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = location,
                            onValueChange = { location = it },
                            label = { Text("Local / Unidade Citada") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandBlue,
                                unfocusedBorderColor = DarkSlateCardBorder,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it },
                            label = { Text("Descrição dos Fatos") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp),
                            maxLines = 5,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandBlue,
                                unfocusedBorderColor = DarkSlateCardBorder,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "Enviar como Anônimo", color = Color.White, fontSize = 13.sp)
                            Switch(
                                checked = isAnonymous,
                                onCheckedChange = { isAnonymous = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = BrandBlue)
                            )
                        }
                    }

                    // Mandatory Privacy Notice
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0x1A0070F3)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x330070F3))
                        ) {
                            Row(modifier = Modifier.padding(12.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = BrandBlue,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Esta ocorrência utiliza dados quantitativos de ruído. O sistema não grava ou armazena áudio.",
                                    fontSize = 11.sp,
                                    color = Color(0xFF93C5FD),
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }

                    item {
                        Button(
                            onClick = {
                                if (description.isNotBlank()) {
                                    onCreateOccurrence(type, location, description, isAnonymous)
                                    description = ""
                                    selectedTab = 0
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                            enabled = description.isNotBlank()
                        ) {
                            Text(text = "Enviar Relato", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
