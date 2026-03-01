package com.splitbill.backend.events

import com.splitbill.backend.events.settlement.domain.MinTransferSettlementStrategy
import com.splitbill.backend.events.settlement.domain.MONEY_SCALE
import com.splitbill.backend.events.settlement.domain.NetBalance
import com.splitbill.backend.events.settlement.domain.PairwiseSettlementStrategy
import com.splitbill.backend.events.settlement.domain.SettlementStrategy
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

@Service
class EventBalanceService(
    private val eventRepository: EventRepository,
    private val eventCollaboratorRepository: EventCollaboratorRepository,
    private val eventPersonRepository: EventPersonRepository,
    private val balanceSnapshotRepository: BalanceSnapshotRepository,
    private val minTransferSettlementStrategy: MinTransferSettlementStrategy,
    private val pairwiseSettlementStrategy: PairwiseSettlementStrategy
) {

    fun getBalances(
        accountId: UUID,
        eventId: UUID,
        algorithmOverride: SettlementAlgorithm?
    ): BalancesResponse {
        val event = requireEventMembership(eventId, accountId)
        val currency = requireNotNull(event.baseCurrency)
        val algorithm = algorithmOverride ?: requireNotNull(event.defaultSettlementAlgorithm)

        val personIds = eventPersonRepository.findAllByEventIdOrderByCreatedAtAsc(eventId)
            .mapNotNull { it.id }
        val snapshotByPerson = balanceSnapshotRepository.findAllByEventIdOrderByPersonIdAsc(eventId)
            .associateBy({ requireNotNull(it.personId) }, { requireNotNull(it.netAmount).scaleMoney() })

        val netBalances = personIds.map { personId ->
            NetBalance(
                personId = personId,
                amount = snapshotByPerson[personId] ?: BigDecimal.ZERO.scaleMoney()
            )
        }

        val transfers = strategyFor(algorithm).settle(netBalances)
        val owesByPerson = personIds.associateWith { mutableListOf<BalanceCounterpartyAmountDto>() }
        val owedByPerson = personIds.associateWith { mutableListOf<BalanceCounterpartyAmountDto>() }

        transfers.forEach { transfer ->
            val money = MoneyDto(amount = transfer.amount.scaleMoney().toPlainString(), currency = currency)
            owesByPerson[transfer.fromPersonId]?.add(
                BalanceCounterpartyAmountDto(counterpartyPersonId = transfer.toPersonId, amount = money)
            )
            owedByPerson[transfer.toPersonId]?.add(
                BalanceCounterpartyAmountDto(counterpartyPersonId = transfer.fromPersonId, amount = money)
            )
        }

        return BalancesResponse(
            eventId = eventId,
            currency = currency,
            algorithm = algorithm,
            balances = personIds.map { personId ->
                BalanceDto(
                    personId = personId,
                    netAmountInEventCurrency = (snapshotByPerson[personId] ?: BigDecimal.ZERO.scaleMoney())
                        .scaleMoney()
                        .toPlainString(),
                    owes = owesByPerson[personId]
                        ?.sortedBy { it.counterpartyPersonId.toString() }
                        ?: emptyList(),
                    owedBy = owedByPerson[personId]
                        ?.sortedBy { it.counterpartyPersonId.toString() }
                        ?: emptyList()
                )
            }
        )
    }

    private fun strategyFor(algorithm: SettlementAlgorithm): SettlementStrategy = when (algorithm) {
        SettlementAlgorithm.MIN_TRANSFER -> minTransferSettlementStrategy
        SettlementAlgorithm.PAIRWISE -> pairwiseSettlementStrategy
    }

    private fun requireEventMembership(eventId: UUID, accountId: UUID): EventEntity {
        val event = eventRepository.findByIdAndArchivedAtIsNull(eventId) ?: throw EventNotFoundException()
        if (!eventCollaboratorRepository.existsByEventIdAndAccountId(eventId, accountId)) {
            throw EventAccessDeniedException()
        }
        return event
    }

    private fun BigDecimal.scaleMoney(): BigDecimal = setScale(MONEY_SCALE, RoundingMode.UNNECESSARY)
}
