package com.dbsound.app.data.repository

import com.dbsound.app.data.model.AlertNotification
import com.dbsound.app.data.model.NoiseEventItem
import com.dbsound.app.data.model.NoiseTelemetry
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flow
import kotlin.random.Random

interface NoiseRepository {
    fun observeTelemetry(apartmentId: String): Flow<NoiseTelemetry>
    suspend fun getRecentEvents(apartmentId: String): List<NoiseEventItem>
    suspend fun getActiveAlerts(apartmentId: String): List<AlertNotification>
    suspend fun acknowledgeAlert(alertId: String)
}

class NoiseRepositoryImpl : NoiseRepository {
    private val _alerts = MutableStateFlow<List<AlertNotification>>(
        listOf(
            AlertNotification(
                id = "alt-1",
                title = "ALERTA!! RUÍDO ALTO DETECTADO",
                message = "Nível de ruído atingiu 83 dB na sua unidade.",
                severity = "critical",
                decibel = 83.4f,
                isRead = false,
                createdAt = "Hoje, às 22:45"
            )
        )
    )

    override fun observeTelemetry(apartmentId: String): Flow<NoiseTelemetry> = flow {
        var baseDb = 48.0f
        while (true) {
            // Simulação de telemetria contínua em tempo real (flutuação de ruído residencial normal)
            val jitter = (Random.nextFloat() - 0.5f) * 4f
            val current = (baseDb + jitter).coerceIn(38f, 98f)
            val status = when {
                current >= 80f -> "critical"
                current >= 70f -> "warning"
                else -> "normal"
            }

            emit(
                NoiseTelemetry(
                    currentDb = current,
                    peakDb = 68.2f,
                    averageDb = 46.5f,
                    status = status,
                    isDeviceOnline = true,
                    lastRecordedAt = "Agora mesmo"
                )
            )
            delay(2000)
        }
    }

    override suspend fun getRecentEvents(apartmentId: String): List<NoiseEventItem> {
        return listOf(
            NoiseEventItem(
                id = "ev-1",
                peakDb = 84.5f,
                averageDb = 76.2f,
                durationSeconds = 18,
                startedAt = "Hoje, 22:45",
                severity = "critical",
                sensorPosition = "Sala"
            ),
            NoiseEventItem(
                id = "ev-2",
                peakDb = 72.0f,
                averageDb = 68.4f,
                durationSeconds = 12,
                startedAt = "Hoje, 19:12",
                severity = "warning",
                sensorPosition = "Cozinha"
            ),
            NoiseEventItem(
                id = "ev-3",
                peakDb = 64.0f,
                averageDb = 55.0f,
                durationSeconds = 8,
                startedAt = "Ontem, 16:30",
                severity = "normal",
                sensorPosition = "Quarto"
            )
        )
    }

    override suspend fun getActiveAlerts(apartmentId: String): List<AlertNotification> {
        return _alerts.value
    }

    override suspend fun acknowledgeAlert(alertId: String) {
        _alerts.value = _alerts.value.map {
            if (it.id == alertId) it.copy(isRead = true) else it
        }
    }
}
