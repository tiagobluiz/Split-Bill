package com.splitbill.backend.events.settlement.domain

import java.math.BigDecimal
import java.util.UUID

data class NetBalance(
    val personId: UUID,
    /** Signed amount in event currency, scaled to MONEY_SCALE. */
    val amount: BigDecimal
)

data class SettlementTransfer(
    val fromPersonId: UUID,
    val toPersonId: UUID,
    /** Transfer amount in event currency, scaled to MONEY_SCALE. */
    val amount: BigDecimal
)

/**
 * Strategy contract for transforming participant net balances into settlement transfers.
 *
 * Input:
 * - `netBalances`: one entry per person, where positive means the person is owed money and
 *   negative means the person owes money.
 *
 * Output:
 * - list of directed transfers (`fromPersonId` -> `toPersonId`) whose amounts settle the
 *   provided net balances under the strategy's policy.
 */
interface SettlementStrategy {
    fun settle(netBalances: List<NetBalance>): List<SettlementTransfer>
}
