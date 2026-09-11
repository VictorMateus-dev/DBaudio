package com.dbsound.app.data.repository

import com.dbsound.app.data.model.OccurrenceCommentItem
import com.dbsound.app.data.model.OccurrenceItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

interface OccurrenceRepository {
    suspend fun getMyOccurrences(): List<OccurrenceItem>
    suspend fun createOccurrence(
        type: String,
        location: String,
        description: String,
        isAnonymous: Boolean
    ): OccurrenceItem
    suspend fun getComments(occurrenceId: String): List<OccurrenceCommentItem>
    suspend fun addComment(occurrenceId: String, comment: String): OccurrenceCommentItem
}

class OccurrenceRepositoryImpl : OccurrenceRepository {
    private val occurrences = mutableListOf(
        OccurrenceItem(
            id = "occ-1",
            type = "Música Alta e Graves",
            location = "Apartamento 202",
            description = "Som alto com caixa amplificada após as 22h30 gerando vibrações no piso.",
            occurredAt = "Hoje, 22:35",
            status = "em análise",
            priority = "alta",
            isAnonymous = false,
            reporterName = "João Silva (101)"
        ),
        OccurrenceItem(
            id = "occ-2",
            type = "Ruído de Furadeira",
            location = "Apartamento 103",
            description = "Obras iniciadas antes do horário comercial no sábado.",
            occurredAt = "15/09/2026, 07:15",
            status = "resolvida",
            priority = "media",
            isAnonymous = true,
            reporterName = "Morador Anônimo"
        )
    )

    private val commentsMap = mutableMapOf(
        "occ-1" to mutableListOf(
            OccurrenceCommentItem(
                id = "c-1",
                occurrenceId = "occ-1",
                authorName = "Carlos Síndico",
                comment = "Ocorrência recebida. Advertência digital enviada ao morador citado.",
                createdAt = "22:50"
            )
        )
    )

    override suspend fun getMyOccurrences(): List<OccurrenceItem> = occurrences.toList()

    override suspend fun createOccurrence(
        type: String,
        location: String,
        description: String,
        isAnonymous: Boolean
    ): OccurrenceItem {
        val dateFormat = SimpleDateFormat("dd/MM/yyyy, HH:mm", Locale.getDefault())
        val newOcc = OccurrenceItem(
            id = "occ-${System.currentTimeMillis()}",
            type = type,
            location = location,
            description = description,
            occurredAt = dateFormat.format(Date()),
            status = "aberta",
            priority = "media",
            isAnonymous = isAnonymous,
            reporterName = if (isAnonymous) "Morador Anônimo" else "João Silva (101)"
        )
        occurrences.add(0, newOcc)
        return newOcc
    }

    override suspend fun getComments(occurrenceId: String): List<OccurrenceCommentItem> {
        return commentsMap[occurrenceId] ?: emptyList()
    }

    override suspend fun addComment(occurrenceId: String, comment: String): OccurrenceCommentItem {
        val dateFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val newComment = OccurrenceCommentItem(
            id = "c-${System.currentTimeMillis()}",
            occurrenceId = occurrenceId,
            authorName = "João Silva (101)",
            comment = comment,
            createdAt = dateFormat.format(Date())
        )
        val list = commentsMap.getOrPut(occurrenceId) { mutableListOf() }
        list.add(newComment)
        return newComment
    }
}
