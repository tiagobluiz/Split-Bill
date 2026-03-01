package com.splitbill.backend.events

import com.splitbill.backend.auth.AuthService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class EventService(
    private val authService: AuthService,
    private val eventRepository: EventRepository,
    private val eventCollaboratorRepository: EventCollaboratorRepository,
    private val eventPersonRepository: EventPersonRepository,
    private val inviteTokenRepository: InviteTokenRepository
) {

    /** Creates an event for the authenticated and verified account. */
    @Transactional
    fun createEvent(authorizationHeader: String?, request: CreateEventRequest): EventResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        authService.requireVerified(account)

        val now = Instant.now()
        val event = eventRepository.save(
            EventEntity(
                id = UUID.randomUUID(),
                ownerAccountId = account.id,
                name = request.name,
                baseCurrency = request.baseCurrency,
                timezone = request.timezone,
                defaultSettlementAlgorithm = request.defaultSettlementAlgorithm ?: "MIN_TRANSFER",
                createdAt = now,
                updatedAt = now
            )
        )

        val eventId = requireNotNull(event.id)
        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, account.id)) {
            eventCollaboratorRepository.save(
                EventCollaboratorEntity(
                    id = UUID.randomUUID(),
                    eventId = eventId,
                    accountId = account.id,
                    role = "OWNER",
                    joinedAt = now
                )
            )
        }

        return EventResponse(event = event.toDto())
    }

    /** Joins an invite for the authenticated and verified account. */
    @Transactional
    fun joinInvite(authorizationHeader: String?, token: String, request: JoinInviteRequest): JoinInviteResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        authService.requireVerified(account)

        val invite = inviteTokenRepository.findByTokenHashAndRevokedAtIsNull(token) ?: throw InviteNotFoundException()
        if (invite.expiresAt != null && invite.expiresAt!!.isBefore(Instant.now())) {
            throw InviteNotFoundException()
        }

        val eventId = requireNotNull(invite.eventId)
        val personId = requireNotNull(request.personId)
        if (!eventPersonRepository.existsByIdAndEventId(personId, eventId)) {
            throw PersonNotFoundException()
        }

        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, account.id)) {
            eventCollaboratorRepository.save(
                EventCollaboratorEntity(
                    id = UUID.randomUUID(),
                    eventId = eventId,
                    accountId = account.id,
                    role = "COLLABORATOR",
                    joinedAt = Instant.now()
                )
            )
        }

        return JoinInviteResponse(eventId = eventId, personId = personId)
    }

    private fun EventEntity.toDto(): EventDto {
        return EventDto(
            id = requireNotNull(id),
            ownerAccountId = requireNotNull(ownerAccountId),
            name = requireNotNull(name),
            baseCurrency = requireNotNull(baseCurrency),
            timezone = requireNotNull(timezone),
            defaultSettlementAlgorithm = requireNotNull(defaultSettlementAlgorithm)
        )
    }
}
