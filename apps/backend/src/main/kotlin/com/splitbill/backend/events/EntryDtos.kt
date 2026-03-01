package com.splitbill.backend.events

import com.splitbill.backend.split.domain.SplitMode
import jakarta.validation.Valid
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class EntryParticipantRequest(
    @field:NotNull
    val personId: UUID,
    @field:NotNull
    val splitMode: SplitMode,
    val splitPercent: BigDecimal? = null,
    val splitAmount: BigDecimal? = null
)

data class CreateEntryRequest(
    @field:NotNull
    val type: EntryType,
    @field:NotBlank
    @field:Size(max = 200)
    val name: String,
    val categoryId: UUID? = null,
    @field:NotNull
    @field:DecimalMin(value = "0.0001")
    val amount: BigDecimal,
    @field:NotBlank
    @field:Pattern(regexp = "^[A-Z]{3}$")
    val currency: String,
    @field:NotNull
    val payerPersonId: UUID,
    @field:NotNull
    val occurredAtUtc: Instant,
    @field:Size(max = 5000)
    val note: String? = null,
    @field:Valid
    @field:NotEmpty
    val participants: List<EntryParticipantRequest>
)

data class UpdateEntryRequest(
    val type: EntryType? = null,
    @field:Pattern(regexp = "^(?!\\s*$).+$")
    @field:Size(max = 200)
    val name: String? = null,
    val categoryId: UUID? = null,
    @field:DecimalMin(value = "0.0001")
    val amount: BigDecimal? = null,
    @field:Pattern(regexp = "^[A-Z]{3}$")
    val currency: String? = null,
    val payerPersonId: UUID? = null,
    val occurredAtUtc: Instant? = null,
    @field:Size(max = 5000)
    val note: String? = null,
    @field:Valid
    val participants: List<EntryParticipantRequest>? = null
)

data class EntryParticipantDto(
    val personId: UUID,
    val splitMode: SplitMode,
    val splitPercent: BigDecimal?,
    val splitAmount: BigDecimal?,
    val resolvedEventAmount: BigDecimal
)

data class EntryDto(
    val id: UUID,
    val eventId: UUID,
    val type: EntryType,
    val name: String,
    val categoryId: UUID?,
    val amount: BigDecimal,
    val currency: String,
    val eventAmount: BigDecimal,
    val payerPersonId: UUID,
    val occurredAtUtc: Instant,
    val note: String?,
    val participants: List<EntryParticipantDto>
)

data class EntryResponse(
    val entry: EntryDto
)

data class EntryListResponse(
    val items: List<EntryDto>
)
