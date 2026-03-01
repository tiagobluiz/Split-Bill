package com.splitbill.backend.events

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

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

    @PostMapping("/invites/{token}/join")
    fun joinInvite(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @PathVariable token: String,
        @Valid @RequestBody request: JoinInviteRequest
    ): JoinInviteResponse {
        return eventService.joinInvite(authorizationHeader, token, request)
    }
}
