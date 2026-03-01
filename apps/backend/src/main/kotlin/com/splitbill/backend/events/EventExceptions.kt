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
