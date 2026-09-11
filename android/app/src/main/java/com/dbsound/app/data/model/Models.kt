package com.dbsound.app.data.model

data class UserProfile(
    val id: String,
    val fullName: String,
    val email: String,
    val phone: String?,
    val role: String, // "resident", "admin"
    val condominiumId: String,
    val apartmentId: String?,
    val apartmentNumber: String = "101"
)

data class NoiseTelemetry(
    val currentDb: Float,
    val peakDb: Float,
    val averageDb: Float,
    val status: String, // "normal", "warning", "critical", "offline"
    val isDeviceOnline: Boolean,
    val lastRecordedAt: String
)

data class NoiseEventItem(
    val id: String,
    val peakDb: Float,
    val averageDb: Float,
    val durationSeconds: Int,
    val startedAt: String,
    val severity: String, // "normal", "warning", "critical"
    val sensorPosition: String = "Sala"
)

data class AlertNotification(
    val id: String,
    val title: String,
    val message: String,
    val severity: String, // "warning", "critical"
    val decibel: Float,
    val isRead: Boolean,
    val createdAt: String
)

data class OccurrenceItem(
    val id: String,
    val type: String,
    val location: String,
    val description: String,
    val occurredAt: String,
    val status: String, // "aberta", "em análise", "resolvida", "cancelada"
    val priority: String, // "baixa", "media", "alta"
    val isAnonymous: Boolean,
    val reporterName: String?
)

data class OccurrenceCommentItem(
    val id: String,
    val occurrenceId: String,
    val authorName: String,
    val comment: String,
    val createdAt: String
)
