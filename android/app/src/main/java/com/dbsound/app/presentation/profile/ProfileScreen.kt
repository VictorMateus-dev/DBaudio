package com.dbsound.app.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dbsound.app.data.model.UserProfile
import com.dbsound.app.presentation.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    user: UserProfile,
    onNavigateToPrivacy: () -> Unit,
    onLogout: () -> Unit
) {
    Scaffold(
        containerColor = DarkSlateBackground,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlateBackground),
                title = {
                    Text(
                        text = "Meu Perfil",
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(BrandBlue),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Text(text = user.fullName, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text(text = "Unidade ${user.apartmentNumber} • Residencial dBSound", fontSize = 12.sp, color = Color(0xFF94A3B8))
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
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        ProfileInfoRow(label = "E-mail", value = user.email, icon = Icons.Default.Email)
                        ProfileInfoRow(label = "Telefone", value = user.phone ?: "(11) 97777-0101", icon = Icons.Default.Email)
                        ProfileInfoRow(label = "Condomínio", value = "Residencial dBSound (Bloco A)", icon = Icons.Default.Home)
                        ProfileInfoRow(label = "Apartamento", value = user.apartmentNumber, icon = Icons.Default.Home)
                    }
                }
            }

            item {
                Card(
                    onClick = onNavigateToPrivacy,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSlateCard),
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkSlateCardBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = BrandBlue)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = "Termos de Privacidade & LGPD", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text(text = "Entenda como protegemos seus dados acústicos", fontSize = 11.sp, color = Color(0xFF94A3B8))
                        }
                        Icon(imageVector = Icons.Default.ArrowForward, contentDescription = null, tint = Color.Gray)
                    }
                }
            }

            item {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = NoiseRed),
                    border = androidx.compose.foundation.BorderStroke(1.dp, NoiseRed.copy(alpha = 0.5f))
                ) {
                    Icon(imageVector = Icons.Default.ExitToApp, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Sair da Conta", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ProfileInfoRow(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(imageVector = icon, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(text = label, fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
            Text(text = value, fontSize = 13.sp, color = Color.White)
        }
    }
}
