package com.splitbill.backend.events

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.util.UUID

data class CreateEventRequest(
    @field:NotBlank
    @field:Size(max = 160)
    val name: String,
    @field:NotBlank
    @field:Pattern(regexp = "^[A-Z]{3}$")
    val baseCurrency: String,
    @field:NotBlank
    @field:Size(max = 64)
    val timezone: String,
    val defaultSettlementAlgorithm: String? = null
)

data class EventDto(
    val id: UUID,
    val ownerAccountId: UUID,
    val name: String,
    val baseCurrency: String,
    val timezone: String,
    val defaultSettlementAlgorithm: String
)

data class EventResponse(
    val event: EventDto
)

data class JoinInviteRequest(
    @field:NotNull
    val personId: UUID
)

data class JoinInviteResponse(
    val eventId: UUID,
    val personId: UUID
)
