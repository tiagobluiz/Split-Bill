package com.splitbill.backend.events.settlement.domain

import java.math.BigDecimal
import java.util.UUID

data class NetBalance(
    val personId: UUID,
    val amount: BigDecimal
)

data class SettlementTransfer(
    val fromPersonId: UUID,
    val toPersonId: UUID,
    val amount: BigDecimal
)

interface SettlementStrategy {
    fun settle(netBalances: List<NetBalance>): List<SettlementTransfer>
}
