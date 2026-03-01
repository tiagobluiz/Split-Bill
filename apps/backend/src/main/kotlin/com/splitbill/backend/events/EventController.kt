package com.splitbill.backend.events

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
    private val eventService: EventService
) {

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    fun createEvent(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @Valid @RequestBody request: CreateEventRequest
    ): EventResponse {
        return eventService.createEvent(authorizationHeader, request)
    }

    @GetMapping("/events")
    fun listEvents(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @RequestParam(name = "page", defaultValue = "1") @Min(1) page: Int,
        @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) pageSize: Int
    ): EventListResponse {
        return eventService.listEvents(authorizationHeader, page, pageSize)
    }

    @GetMapping("/events/{eventId}")
    fun getEvent(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID
    ): EventDetailsResponse {
        return eventService.getEventDetails(authorizationHeader, eventId)
    }

    @PatchMapping("/events/{eventId}")
    fun updateEvent(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: UpdateEventRequest
    ): EventResponse {
        return eventService.updateEvent(authorizationHeader, eventId, request)
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteEvent(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID
    ) {
        eventService.deleteEvent(authorizationHeader, eventId)
    }

    @PostMapping("/events/{eventId}/people")
    @ResponseStatus(HttpStatus.CREATED)
    fun createPerson(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: CreatePersonRequest
    ): PersonResponse {
        return eventService.createPerson(authorizationHeader, eventId, request)
    }

    @PatchMapping("/events/{eventId}/people/{personId}")
    fun updatePerson(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable eventId: UUID,
        @PathVariable personId: UUID,
        @Valid @RequestBody request: UpdatePersonRequest
    ): PersonResponse {
        return eventService.updatePerson(authorizationHeader, eventId, personId, request)
    }

    @PostMapping("/invites/{token}/join")
    fun joinInvite(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable token: String,
        @Valid @RequestBody request: JoinInviteRequest
    ): JoinInviteResponse {
        return eventService.joinInvite(authorizationHeader, token, request)
    }
}
