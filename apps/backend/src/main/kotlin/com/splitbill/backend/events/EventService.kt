package com.splitbill.backend.events

import com.splitbill.backend.api.ApiException
import com.splitbill.backend.auth.AuthService
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Service
class EventService(
    private val jdbcTemplate: JdbcTemplate,
    private val authService: AuthService
) {

    fun createEvent(authorizationHeader: String?, request: CreateEventRequest): EventResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        authService.requireVerified(account)

        val event = insertEvent(
            ownerAccountId = account.id,
            name = request.name,
            baseCurrency = request.baseCurrency,
            timezone = request.timezone,
            defaultSettlementAlgorithm = request.defaultSettlementAlgorithm ?: "MIN_TRANSFER"
        )

        insertOwnerCollaborator(event.id, account.id)

        return EventResponse(event = event)
    }

    fun joinInvite(authorizationHeader: String?, token: String, request: JoinInviteRequest): JoinInviteResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        authService.requireVerified(account)

        val eventId = findInviteEvent(token)
        val personExists = jdbcTemplate.queryForObject(
            """
            SELECT EXISTS(
                SELECT 1
                FROM event_people
                WHERE id = ? AND event_id = ?
            )
            """.trimIndent(),
            Boolean::class.java,
            request.personId,
            eventId
        ) ?: false

        if (!personExists) {
            throw ApiException(
                status = HttpStatus.NOT_FOUND,
                code = "PERSON_NOT_FOUND",
                message = "Person was not found in this event"
            )
        }

        jdbcTemplate.update(
            """
            INSERT INTO event_collaborators (id, event_id, account_id, role)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (event_id, account_id) DO NOTHING
            """.trimIndent(),
            UUID.randomUUID(),
            eventId,
            account.id,
            "COLLABORATOR"
        )

        return JoinInviteResponse(eventId = eventId, personId = request.personId)
    }

    private fun insertEvent(
        ownerAccountId: UUID,
        name: String,
        baseCurrency: String,
        timezone: String,
        defaultSettlementAlgorithm: String
    ): EventDto {
        val eventId = UUID.randomUUID()
        val now = Timestamp.from(Instant.now())
        jdbcTemplate.update(
            """
            INSERT INTO events (
                id, owner_account_id, name, base_currency, timezone,
                default_settlement_algorithm, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            eventId,
            ownerAccountId,
            name,
            baseCurrency,
            timezone,
            defaultSettlementAlgorithm,
            now,
            now
        )

        return EventDto(
            id = eventId,
            ownerAccountId = ownerAccountId,
            name = name,
            baseCurrency = baseCurrency,
            timezone = timezone,
            defaultSettlementAlgorithm = defaultSettlementAlgorithm
        )
    }

    private fun insertOwnerCollaborator(eventId: UUID, accountId: UUID) {
        jdbcTemplate.update(
            """
            INSERT INTO event_collaborators (id, event_id, account_id, role)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (event_id, account_id) DO NOTHING
            """.trimIndent(),
            UUID.randomUUID(),
            eventId,
            accountId,
            "OWNER"
        )
    }

    private fun findInviteEvent(token: String): UUID {
        val rows = jdbcTemplate.queryForList(
            """
            SELECT event_id
            FROM invite_tokens
            WHERE token_hash = ?
              AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > NOW())
            LIMIT 1
            """.trimIndent(),
            UUID::class.java,
            token
        )

        return rows.firstOrNull() ?: throw ApiException(
            status = HttpStatus.NOT_FOUND,
            code = "INVITE_NOT_FOUND",
            message = "Invite token is invalid or expired"
        )
    }
}
