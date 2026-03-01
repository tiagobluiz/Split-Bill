package com.splitbill.backend.events.settlement.domain

import org.springframework.stereotype.Component
import java.util.UUID
import kotlin.math.min

@Component
class PairwiseSettlementStrategy : SettlementStrategy {

    override fun settle(netBalances: List<NetBalance>): List<SettlementTransfer> {
        val creditors = netBalances
            .map { Bucket(it.personId, it.amount.toMinorUnits()) }
            .filter { it.amount > 0L }
            .sortedBy { it.personId.toString() }
            .toMutableList()
        val debtors = netBalances
            .map { Bucket(it.personId, -it.amount.toMinorUnits()) }
            .filter { it.amount > 0L }
            .sortedBy { it.personId.toString() }

        val transfers = mutableListOf<SettlementTransfer>()
        for (debtor in debtors) {
            var remaining = debtor.amount
            for (creditor in creditors) {
                if (remaining == 0L) {
                    break
                }
                if (creditor.amount == 0L) {
                    continue
                }

                val transferMinor = min(remaining, creditor.amount)
                transfers += SettlementTransfer(
                    fromPersonId = debtor.personId,
                    toPersonId = creditor.personId,
                    amount = transferMinor.toMoneyAmount()
                )

                remaining -= transferMinor
                creditor.amount -= transferMinor
            }
        }

        return transfers
    }

    private data class Bucket(
        val personId: UUID,
        var amount: Long
    )
}
