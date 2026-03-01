package com.splitbill.backend.events

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.time.Clock
import java.time.Instant
import java.util.UUID

@Service
class EventService(
    private val eventRepository: EventRepository,
    private val eventCollaboratorRepository: EventCollaboratorRepository,
    private val eventPersonRepository: EventPersonRepository,
    private val inviteTokenRepository: InviteTokenRepository,
    private val clock: Clock
) {

    /** Creates an event for the authenticated and verified account. */
    @Transactional
    fun createEvent(accountId: UUID, request: CreateEventRequest): EventResponse {
        val now = Instant.now(clock)
        val event = eventRepository.save(
            EventEntity(
                id = UUID.randomUUID(),
                ownerAccountId = accountId,
                name = request.name,
                baseCurrency = request.baseCurrency,
                timezone = request.timezone,
                defaultSettlementAlgorithm = request.defaultSettlementAlgorithm ?: SettlementAlgorithm.MIN_TRANSFER,
                createdAt = now,
                updatedAt = now
            )
        )

        val eventId = requireNotNull(event.id)
        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, accountId)) {
            eventCollaboratorRepository.save(
                EventCollaboratorEntity(
                    id = UUID.randomUUID(),
                    eventId = eventId,
                    accountId = accountId,
                    role = "OWNER",
                    joinedAt = now
                )
            )
        }

        return EventResponse(event = event.toDto())
    }

    /** Returns paginated events where the authenticated account is a collaborator. */
    fun listEvents(accountId: UUID, page: Int, pageSize: Int): EventListResponse {
        val collaboratorRows = eventCollaboratorRepository.findAllByAccountId(accountId)
        val eventIds = collaboratorRows.mapNotNull { it.eventId }.distinct()

        val activeEvents = if (eventIds.isEmpty()) {
            emptyList()
        } else {
            eventRepository.findAllByIdInAndArchivedAtIsNull(eventIds)
                .sortedByDescending { it.createdAt }
        }

        val totalItems = activeEvents.size
        val fromIdx = ((page - 1) * pageSize).coerceAtMost(totalItems)
        val toIdx = (fromIdx + pageSize).coerceAtMost(totalItems)
        val items = if (fromIdx >= toIdx) emptyList() else activeEvents.subList(fromIdx, toIdx).map { it.toDto() }

        return EventListResponse(
            items = items,
            page = page,
            pageSize = pageSize,
            totalItems = totalItems
        )
    }

    /** Returns event details including people and collaborators for authorized accounts. */
    fun getEventDetails(accountId: UUID, eventId: UUID): EventDetailsResponse {
        val event = requireEventMembership(eventId, accountId)

        val people = eventPersonRepository.findAllByEventIdOrderByCreatedAtAsc(eventId).map { it.toPersonDto() }
        val collaborators = eventCollaboratorRepository.findAllByEventId(eventId)
            .map {
                EventCollaboratorDto(
                    accountId = requireNotNull(it.accountId),
                    role = requireNotNull(it.role),
                    joinedAt = requireNotNull(it.joinedAt)
                )
            }
            .sortedBy { it.joinedAt }

        return EventDetailsResponse(
            event = event.toDto(),
            people = people,
            collaborators = collaborators
        )
    }

    /** Updates event settings for the event owner. */
    @Transactional
    fun updateEvent(accountId: UUID, eventId: UUID, request: UpdateEventRequest): EventResponse {
        val event = requireEventOwner(eventId, accountId)

        request.name?.let { event.name = it }
        request.timezone?.let { event.timezone = it }
        request.defaultSettlementAlgorithm?.let { event.defaultSettlementAlgorithm = it }
        event.updatedAt = Instant.now(clock)

        return EventResponse(event = eventRepository.save(event).toDto())
    }

    /** Archives an event for the owner. */
    @Transactional
    fun deleteEvent(accountId: UUID, eventId: UUID) {
        val event = requireEventOwner(eventId, accountId)
        event.archivedAt = Instant.now(clock)
        event.updatedAt = Instant.now(clock)
        eventRepository.save(event)
    }

    /** Creates a person under an event for split calculations. */
    @Transactional
    fun createPerson(accountId: UUID, eventId: UUID, request: CreatePersonRequest): PersonResponse {
        requireEventOwner(eventId, accountId)

        val now = Instant.now(clock)
        val person = eventPersonRepository.save(
            EventPersonEntity(
                id = UUID.randomUUID(),
                eventId = eventId,
                displayName = request.displayName,
                linkedAccountId = request.linkedAccountId,
                createdByAccountId = accountId,
                createdAt = now,
                updatedAt = now
            )
        )

        return PersonResponse(person = person.toPersonDto())
    }

    /** Updates person metadata for an event, owner-only. */
    @Transactional
    fun updatePerson(
        accountId: UUID,
        eventId: UUID,
        personId: UUID,
        request: UpdatePersonRequest
    ): PersonResponse {
        requireEventOwner(eventId, accountId)

        val person = eventPersonRepository.findByIdAndEventId(personId, eventId) ?: throw PersonNotFoundException()

        request.displayName?.let { person.displayName = it }
        if (request.linkedAccountId != null) {
            person.linkedAccountId = request.linkedAccountId
        }
        person.updatedAt = Instant.now(clock)

        return PersonResponse(person = eventPersonRepository.save(person).toPersonDto())
    }

    /** Joins an invite for the authenticated and verified account. */
    @Transactional
    fun joinInvite(accountId: UUID, token: String, request: JoinInviteRequest): JoinInviteResponse {
        val invite = inviteTokenRepository.findByTokenHashAndRevokedAtIsNull(hashInviteToken(token))
            ?: throw InviteNotFoundException()

        val now = Instant.now(clock)
        if (invite.expiresAt != null && !invite.expiresAt!!.isAfter(now)) {
            throw InviteNotFoundException()
        }

        val eventId = requireNotNull(invite.eventId)
        val personId = request.personId
        if (!eventPersonRepository.existsByIdAndEventId(personId, eventId)) {
            throw PersonNotFoundException()
        }

        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, accountId)) {
            eventCollaboratorRepository.save(
                EventCollaboratorEntity(
                    id = UUID.randomUUID(),
                    eventId = eventId,
                    accountId = accountId,
                    role = "COLLABORATOR",
                    joinedAt = Instant.now(clock)
                )
            )
        }

        return JoinInviteResponse(eventId = eventId, personId = personId)
    }

    private fun requireEventMembership(eventId: UUID, accountId: UUID): EventEntity {
        val event = eventRepository.findByIdAndArchivedAtIsNull(eventId) ?: throw EventNotFoundException()
        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, accountId)) {
            throw EventAccessDeniedException()
        }
        return event
    }

    private fun requireEventOwner(eventId: UUID, accountId: UUID): EventEntity {
        val event = requireEventMembership(eventId, accountId)
        if (event.ownerAccountId != accountId) {
            throw EventOwnerRequiredException()
        }
        return event
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

    private fun EventPersonEntity.toPersonDto(): PersonDto {
        return PersonDto(
            id = requireNotNull(id),
            eventId = requireNotNull(eventId),
            displayName = requireNotNull(displayName),
            linkedAccountId = linkedAccountId
        )
    }

    private fun hashInviteToken(rawToken: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(rawToken.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}
