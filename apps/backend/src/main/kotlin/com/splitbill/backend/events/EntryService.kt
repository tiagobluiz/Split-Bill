package com.splitbill.backend.events

import com.splitbill.backend.split.application.SplitCalculationApplicationService
import com.splitbill.backend.split.domain.AmountSplitInstruction
import com.splitbill.backend.split.domain.CurrencyCode
import com.splitbill.backend.split.domain.DecimalAmount
import com.splitbill.backend.split.domain.EvenSplitInstruction
import com.splitbill.backend.split.domain.ParticipantId
import com.splitbill.backend.split.domain.ParticipantSplitInstruction
import com.splitbill.backend.split.domain.PercentSplitInstruction
import com.splitbill.backend.split.domain.Percentage
import com.splitbill.backend.split.domain.SplitCalculationRequest
import com.splitbill.backend.split.domain.SplitValidationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.Instant
import java.util.UUID

@Service
class EntryService(
    private val eventRepository: EventRepository,
    private val eventCollaboratorRepository: EventCollaboratorRepository,
    private val eventPersonRepository: EventPersonRepository,
    private val entryRepository: EntryRepository,
    private val entryParticipantRepository: EntryParticipantRepository,
    private val balanceSnapshotRepository: BalanceSnapshotRepository,
    private val splitCalculationApplicationService: SplitCalculationApplicationService,
    private val clock: Clock
) {

    @Transactional
    fun createEntry(accountId: UUID, eventId: UUID, request: CreateEntryRequest): EntryResponse {
        val event = requireEventMembership(eventId, accountId)
        validatePayerBelongsToEvent(eventId, request.payerPersonId)
        val participantInstructions = validateParticipantPeopleAndBuildInstructions(eventId, request.participants)
        val eventAmount = resolveEventAmount(request.currency, request.amount, event.baseCurrency!!)

        val splitResult = calculateSplit(eventAmount, event.baseCurrency!!, participantInstructions)
        val now = Instant.now(clock)
        val entry = entryRepository.save(
            EntryEntity(
                id = UUID.randomUUID(),
                eventId = eventId,
                type = request.type,
                name = request.name,
                categoryId = request.categoryId,
                amount = request.amount.scaleMoney(),
                currency = request.currency,
                eventAmount = eventAmount,
                payerPersonId = request.payerPersonId,
                occurredAtUtc = request.occurredAtUtc,
                note = request.note,
                createdByAccountId = accountId,
                createdAt = now,
                updatedAt = now
            )
        )

        val entryId = requireNotNull(entry.id)
        val participantRows = splitResult.allocations.map { allocation ->
            val source = request.participants.first { it.personId == allocation.participantId.value }
            EntryParticipantEntity(
                id = UUID.randomUUID(),
                entryId = entryId,
                personId = allocation.participantId.value,
                splitMode = source.splitMode,
                splitPercent = source.splitPercent?.setScale(4, RoundingMode.UNNECESSARY),
                splitAmount = source.splitAmount?.setScale(4, RoundingMode.UNNECESSARY),
                resolvedEventAmount = allocation.amount.value,
                createdAt = now
            )
        }
        entryParticipantRepository.saveAll(participantRows)

        recomputeBalanceSnapshots(eventId)
        return EntryResponse(entry = toEntryDto(entry, participantRows))
    }

    @Transactional
    fun updateEntry(accountId: UUID, eventId: UUID, entryId: UUID, request: UpdateEntryRequest): EntryResponse {
        val event = requireEventMembership(eventId, accountId)
        val entry = entryRepository.findByIdAndEventIdAndDeletedAtIsNull(entryId, eventId) ?: throw EntryNotFoundException()

        val nextType = request.type ?: requireNotNull(entry.type)
        val nextName = request.name ?: requireNotNull(entry.name)
        val nextCategoryId = request.categoryId ?: entry.categoryId
        val nextAmount = (request.amount ?: requireNotNull(entry.amount)).scaleMoney()
        val nextCurrency = request.currency ?: requireNotNull(entry.currency)
        val nextPayerPersonId = request.payerPersonId ?: requireNotNull(entry.payerPersonId)
        val nextOccurredAtUtc = request.occurredAtUtc ?: requireNotNull(entry.occurredAtUtc)
        val nextNote = request.note ?: entry.note
        val nextParticipantInput = request.participants ?: currentParticipantRequests(entryId)

        validatePayerBelongsToEvent(eventId, nextPayerPersonId)
        val participantInstructions = validateParticipantPeopleAndBuildInstructions(eventId, nextParticipantInput)
        val nextEventAmount = resolveEventAmount(nextCurrency, nextAmount, event.baseCurrency!!)
        val splitResult = calculateSplit(nextEventAmount, event.baseCurrency!!, participantInstructions)

        entry.type = nextType
        entry.name = nextName
        entry.categoryId = nextCategoryId
        entry.amount = nextAmount
        entry.currency = nextCurrency
        entry.eventAmount = nextEventAmount
        entry.payerPersonId = nextPayerPersonId
        entry.occurredAtUtc = nextOccurredAtUtc
        entry.note = nextNote
        entry.updatedAt = Instant.now(clock)
        val saved = entryRepository.save(entry)

        val existingParticipants = entryParticipantRepository.findAllByEntryIdOrderByCreatedAtAsc(entryId)
        if (existingParticipants.isNotEmpty()) {
            entryParticipantRepository.deleteAllInBatch(existingParticipants)
            entryParticipantRepository.flush()
        }
        val participantRows = splitResult.allocations.map { allocation ->
            val source = nextParticipantInput.first { it.personId == allocation.participantId.value }
            EntryParticipantEntity(
                id = UUID.randomUUID(),
                entryId = entryId,
                personId = allocation.participantId.value,
                splitMode = source.splitMode,
                splitPercent = source.splitPercent?.setScale(4, RoundingMode.UNNECESSARY),
                splitAmount = source.splitAmount?.setScale(4, RoundingMode.UNNECESSARY),
                resolvedEventAmount = allocation.amount.value,
                createdAt = Instant.now(clock)
            )
        }
        entryParticipantRepository.saveAll(participantRows)

        recomputeBalanceSnapshots(eventId)
        return EntryResponse(entry = toEntryDto(saved, participantRows))
    }

    @Transactional
    fun deleteEntry(accountId: UUID, eventId: UUID, entryId: UUID) {
        requireEventMembership(eventId, accountId)
        val entry = entryRepository.findByIdAndEventIdAndDeletedAtIsNull(entryId, eventId) ?: throw EntryNotFoundException()
        entry.deletedAt = Instant.now(clock)
        entry.updatedAt = Instant.now(clock)
        entryRepository.save(entry)
        recomputeBalanceSnapshots(eventId)
    }

    fun listEntries(accountId: UUID, eventId: UUID): EntryListResponse {
        requireEventMembership(eventId, accountId)
        val entries = entryRepository.findAllByEventIdAndDeletedAtIsNullOrderByOccurredAtUtcDescCreatedAtDesc(eventId)
        val participantsByEntry = entryParticipantRepository.findAllByEntryIdIn(entries.mapNotNull { it.id })
            .groupBy { it.entryId }

        return EntryListResponse(
            items = entries.map { entry ->
                toEntryDto(entry, participantsByEntry[entry.id] ?: emptyList())
            }
        )
    }

    fun getEntry(accountId: UUID, eventId: UUID, entryId: UUID): EntryResponse {
        requireEventMembership(eventId, accountId)
        val entry = entryRepository.findByIdAndEventIdAndDeletedAtIsNull(entryId, eventId) ?: throw EntryNotFoundException()
        val participants = entryParticipantRepository.findAllByEntryIdOrderByCreatedAtAsc(entryId)
        return EntryResponse(entry = toEntryDto(entry, participants))
    }

    private fun calculateSplit(
        eventAmount: BigDecimal,
        eventCurrency: String,
        participantInstructions: List<ParticipantSplitInstruction>
    ) = try {
        splitCalculationApplicationService.calculate(
            SplitCalculationRequest.of(
                totalAmount = DecimalAmount.of(eventAmount),
                currency = CurrencyCode.of(eventCurrency),
                participantSplits = participantInstructions
            )
        )
    } catch (ex: SplitValidationException) {
        throw EntrySplitInvalidException(ex.violations)
    } catch (ex: IllegalArgumentException) {
        throw EntrySplitInvalidException(listOf(ex.message ?: "invalid split input"))
    }

    private fun validateParticipantPeopleAndBuildInstructions(
        eventId: UUID,
        participants: List<EntryParticipantRequest>
    ): List<ParticipantSplitInstruction> {
        val allowedPeople = eventPersonRepository.findAllByEventIdOrderByCreatedAtAsc(eventId).mapNotNull { it.id }.toSet()
        if (participants.any { it.personId !in allowedPeople }) {
            throw EntryParticipantNotInEventException()
        }

        return participants.map { participant ->
            when (participant.splitMode) {
                com.splitbill.backend.split.domain.SplitMode.EVEN -> EvenSplitInstruction(ParticipantId.of(participant.personId))
                com.splitbill.backend.split.domain.SplitMode.PERCENT -> {
                    val percent = participant.splitPercent ?: throw EntrySplitInvalidException(
                        listOf("splitPercent is required for PERCENT split mode")
                    )
                    PercentSplitInstruction(ParticipantId.of(participant.personId), Percentage.of(percent))
                }

                com.splitbill.backend.split.domain.SplitMode.AMOUNT -> {
                    val amount = participant.splitAmount ?: throw EntrySplitInvalidException(
                        listOf("splitAmount is required for AMOUNT split mode")
                    )
                    AmountSplitInstruction(ParticipantId.of(participant.personId), DecimalAmount.of(amount.scaleMoney()))
                }
            }
        }
    }

    private fun recomputeBalanceSnapshots(eventId: UUID) {
        val activeEntries = entryRepository.findAllByEventIdAndDeletedAtIsNullOrderByOccurredAtUtcDescCreatedAtDesc(eventId)
        val entryParticipantsByEntry = entryParticipantRepository.findAllByEntryIdIn(activeEntries.mapNotNull { it.id })
            .groupBy { it.entryId }

        val eventPeople = eventPersonRepository.findAllByEventIdOrderByCreatedAtAsc(eventId).mapNotNull { it.id }
        val deltas = eventPeople.associateWith { BigDecimal.ZERO.setScale(4, RoundingMode.UNNECESSARY) }.toMutableMap()

        for (entry in activeEntries) {
            val payer = requireNotNull(entry.payerPersonId)
            val eventAmount = requireNotNull(entry.eventAmount).scaleMoney()
            val participants = entryParticipantsByEntry[entry.id] ?: emptyList()

            when (requireNotNull(entry.type)) {
                EntryType.EXPENSE -> {
                    deltas[payer] = (deltas[payer] ?: BigDecimal.ZERO).add(eventAmount).scaleMoney()
                    participants.forEach {
                        val personId = requireNotNull(it.personId)
                        val resolved = requireNotNull(it.resolvedEventAmount).scaleMoney()
                        deltas[personId] = (deltas[personId] ?: BigDecimal.ZERO).subtract(resolved).scaleMoney()
                    }
                }

                EntryType.INCOME -> {
                    deltas[payer] = (deltas[payer] ?: BigDecimal.ZERO).subtract(eventAmount).scaleMoney()
                    participants.forEach {
                        val personId = requireNotNull(it.personId)
                        val resolved = requireNotNull(it.resolvedEventAmount).scaleMoney()
                        deltas[personId] = (deltas[personId] ?: BigDecimal.ZERO).add(resolved).scaleMoney()
                    }
                }
            }
        }

        val now = Instant.now(clock)
        val existingSnapshots = balanceSnapshotRepository.findAllByEventIdOrderByPersonIdAsc(eventId)
        if (existingSnapshots.isNotEmpty()) {
            balanceSnapshotRepository.deleteAllInBatch(existingSnapshots)
            balanceSnapshotRepository.flush()
        }
        balanceSnapshotRepository.saveAll(
            deltas.entries.map {
                BalanceSnapshotEntity(
                    id = UUID.randomUUID(),
                    eventId = eventId,
                    personId = it.key,
                    netAmount = it.value.scaleMoney(),
                    computedAt = now
                )
            }
        )
    }

    private fun currentParticipantRequests(entryId: UUID): List<EntryParticipantRequest> {
        return entryParticipantRepository.findAllByEntryIdOrderByCreatedAtAsc(entryId).map {
            EntryParticipantRequest(
                personId = requireNotNull(it.personId),
                splitMode = requireNotNull(it.splitMode),
                splitPercent = it.splitPercent,
                splitAmount = it.splitAmount
            )
        }
    }

    private fun resolveEventAmount(entryCurrency: String, amount: BigDecimal, eventCurrency: String): BigDecimal {
        val normalizedCurrency = entryCurrency.trim().uppercase()
        if (normalizedCurrency != eventCurrency.uppercase()) {
            throw EntryCurrencyConversionNotSupportedException()
        }
        return amount.scaleMoney()
    }

    private fun validatePayerBelongsToEvent(eventId: UUID, payerPersonId: UUID) {
        if (!eventPersonRepository.existsByIdAndEventId(payerPersonId, eventId)) {
            throw PersonNotFoundException()
        }
    }

    private fun requireEventMembership(eventId: UUID, accountId: UUID): EventEntity {
        val event = eventRepository.findByIdAndArchivedAtIsNull(eventId) ?: throw EventNotFoundException()
        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, accountId)) {
            throw EventAccessDeniedException()
        }
        return event
    }

    private fun toEntryDto(entry: EntryEntity, participants: List<EntryParticipantEntity>): EntryDto {
        return EntryDto(
            id = requireNotNull(entry.id),
            eventId = requireNotNull(entry.eventId),
            type = requireNotNull(entry.type),
            name = requireNotNull(entry.name),
            categoryId = entry.categoryId,
            amount = requireNotNull(entry.amount).scaleMoney(),
            currency = requireNotNull(entry.currency),
            eventAmount = requireNotNull(entry.eventAmount).scaleMoney(),
            payerPersonId = requireNotNull(entry.payerPersonId),
            occurredAtUtc = requireNotNull(entry.occurredAtUtc),
            note = entry.note,
            participants = participants.sortedBy { requireNotNull(it.personId).toString() }.map {
                EntryParticipantDto(
                    personId = requireNotNull(it.personId),
                    splitMode = requireNotNull(it.splitMode),
                    splitPercent = it.splitPercent,
                    splitAmount = it.splitAmount,
                    resolvedEventAmount = requireNotNull(it.resolvedEventAmount).scaleMoney()
                )
            }
        )
    }

    private fun BigDecimal.scaleMoney(): BigDecimal = setScale(4, RoundingMode.UNNECESSARY)
}
