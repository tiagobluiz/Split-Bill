package com.splitbill.backend.events.settlement.domain

import org.springframework.stereotype.Component
import java.util.UUID
import kotlin.math.min

@Component
/**
 * Greedy settlement strategy that prioritizes the largest outstanding creditor/debtor buckets
 * first to reduce transfer count for the same net balance set.
 *
 * Input:
 * - net balances where positive amounts are creditors and negative amounts are debtors.
 *
 * Output:
 * - deterministic transfer list that settles balances with transfer-minimizing intent.
 */
class MinTransferSettlementStrategy : SettlementStrategy {

    override fun settle(netBalances: List<NetBalance>): List<SettlementTransfer> {
        val creditors = netBalances
            .map { Bucket(it.personId, it.amount.toMinorUnits()) }
            .filter { it.amount > 0L }
            .toMutableList()
        val debtors = netBalances
            .map { Bucket(it.personId, -it.amount.toMinorUnits()) }
            .filter { it.amount > 0L }
            .toMutableList()

        val transfers = mutableListOf<SettlementTransfer>()
        while (creditors.isNotEmpty() && debtors.isNotEmpty()) {
            creditors.sortWith(compareByDescending<Bucket> { it.amount }.thenBy { it.personId.toString() })
            debtors.sortWith(compareByDescending<Bucket> { it.amount }.thenBy { it.personId.toString() })

            val creditor = creditors.first()
            val debtor = debtors.first()
            val transferMinor = min(creditor.amount, debtor.amount)
            if (transferMinor <= 0L) {
                break
            }

            transfers += SettlementTransfer(
                fromPersonId = debtor.personId,
                toPersonId = creditor.personId,
                amount = transferMinor.toMoneyAmount()
            )

            creditor.amount -= transferMinor
            debtor.amount -= transferMinor
            if (creditor.amount == 0L) {
                creditors.removeAt(0)
            }
            if (debtor.amount == 0L) {
                debtors.removeAt(0)
            }
        }

        return transfers
    }

    private data class Bucket(
        val personId: UUID,
        var amount: Long
    )
}
