package com.splitbill.backend.events

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

enum class SettlementAlgorithm {
    MIN_TRANSFER,
    PAIRWISE
}

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
    val defaultSettlementAlgorithm: SettlementAlgorithm? = null
)

data class UpdateEventRequest(
    @field:Size(max = 160)
    val name: String? = null,
    @field:Size(max = 64)
    val timezone: String? = null,
    val defaultSettlementAlgorithm: SettlementAlgorithm? = null
)

data class EventDto(
    val id: UUID,
    val ownerAccountId: UUID,
    val name: String,
    val baseCurrency: String,
    val timezone: String,
    val defaultSettlementAlgorithm: SettlementAlgorithm
)

data class EventResponse(
    val event: EventDto
)

data class EventListResponse(
    val items: List<EventDto>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Int
)

data class EventCollaboratorDto(
    val accountId: UUID,
    val role: String,
    val joinedAt: Instant
)

data class EventDetailsResponse(
    val event: EventDto,
    val people: List<PersonDto>,
    val collaborators: List<EventCollaboratorDto>
)

data class CreatePersonRequest(
    @field:NotBlank
    @field:Size(max = 120)
    val displayName: String,
    val linkedAccountId: UUID? = null
)

data class UpdatePersonRequest(
    @field:Size(max = 120)
    val displayName: String? = null,
    val linkedAccountId: UUID? = null
)

data class PersonDto(
    val id: UUID,
    val eventId: UUID,
    val displayName: String,
    val linkedAccountId: UUID?
)

data class PersonResponse(
    val person: PersonDto
)

data class JoinInviteRequest(
    @field:NotNull
    val personId: UUID
)

data class JoinInviteResponse(
    val eventId: UUID,
    val personId: UUID
)

data class PageParams(
    @field:Min(1)
    val page: Int = 1,
    @field:Min(1)
    @field:Max(100)
    val pageSize: Int = 20
)
