package com.splitbill.backend.events

import com.splitbill.backend.auth.AuthService
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class EventController(
    private val eventService: EventService,
    private val entryService: EntryService,
    private val authService: AuthService
) {

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    fun createEvent(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @Valid @RequestBody request: CreateEventRequest
    ): EventResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        authService.requireVerified(account)
        return eventService.createEvent(account.id, request)
    }

    @GetMapping("/events")
    fun listEvents(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @RequestParam(defaultValue = "1") @Min(1) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) pageSize: Int
    ): EventListResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return eventService.listEvents(account.id, page, pageSize)
    }

    @GetMapping("/events/{eventId}")
    fun getEvent(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID
    ): EventDetailsResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return eventService.getEventDetails(account.id, eventId)
    }

    @PatchMapping("/events/{eventId}")
    fun updateEvent(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: UpdateEventRequest
    ): EventResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return eventService.updateEvent(account.id, eventId, request)
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteEvent(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID
    ) {
        val account = authService.requireAuthenticated(authorizationHeader)
        eventService.deleteEvent(account.id, eventId)
    }

    @PostMapping("/events/{eventId}/people")
    @ResponseStatus(HttpStatus.CREATED)
    fun createPerson(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: CreatePersonRequest
    ): PersonResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return eventService.createPerson(account.id, eventId, request)
    }

    @PatchMapping("/events/{eventId}/people/{personId}")
    fun updatePerson(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @PathVariable personId: UUID,
        @Valid @RequestBody request: UpdatePersonRequest
    ): PersonResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return eventService.updatePerson(account.id, eventId, personId, request)
    }

    @PostMapping("/invites/{token}/join")
    fun joinInvite(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable token: String,
        @Valid @RequestBody request: JoinInviteRequest
    ): JoinInviteResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        authService.requireVerified(account)
        return eventService.joinInvite(account.id, token, request)
    }

    @PostMapping("/events/{eventId}/entries")
    @ResponseStatus(HttpStatus.CREATED)
    fun createEntry(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: CreateEntryRequest
    ): EntryResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return entryService.createEntry(account.id, eventId, request)
    }

    @GetMapping("/events/{eventId}/entries")
    fun listEntries(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID
    ): EntryListResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return entryService.listEntries(account.id, eventId)
    }

    @GetMapping("/events/{eventId}/entries/{entryId}")
    fun getEntry(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @PathVariable entryId: UUID
    ): EntryResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return entryService.getEntry(account.id, eventId, entryId)
    }

    @PatchMapping("/events/{eventId}/entries/{entryId}")
    fun updateEntry(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @PathVariable entryId: UUID,
        @Valid @RequestBody request: UpdateEntryRequest
    ): EntryResponse {
        val account = authService.requireAuthenticated(authorizationHeader)
        return entryService.updateEntry(account.id, eventId, entryId, request)
    }

    @DeleteMapping("/events/{eventId}/entries/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteEntry(
        @RequestHeader("Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @PathVariable entryId: UUID
    ) {
        val account = authService.requireAuthenticated(authorizationHeader)
        entryService.deleteEntry(account.id, eventId, entryId)
    }
}
