package com.splitbill.backend.events

import com.splitbill.backend.api.ApiException
import org.springframework.http.HttpStatus

class InviteNotFoundException : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "INVITE_NOT_FOUND",
    message = "Invite token is invalid or expired"
)

class PersonNotFoundException : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "PERSON_NOT_FOUND",
    message = "Person was not found in this event"
)

class EventNotFoundException : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "EVENT_NOT_FOUND",
    message = "Event was not found"
)

class EventAccessDeniedException : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = "EVENT_ACCESS_DENIED",
    message = "You do not have access to this event"
)

class EventOwnerRequiredException : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = "EVENT_OWNER_REQUIRED",
    message = "Only the event owner can perform this action"
)
