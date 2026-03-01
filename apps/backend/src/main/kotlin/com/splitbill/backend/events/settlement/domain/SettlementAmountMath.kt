package com.splitbill.backend.events.settlement.domain

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Split-Bill v1 stores money with fixed 4-decimal precision in persistence and domain flows.
 * Currency-specific minor units can be introduced later together with a data model migration.
 */
private const val MONEY_SCALE = 4
private val MONEY_FACTOR = BigDecimal.TEN.pow(MONEY_SCALE)

/** Converts scaled decimal money to fixed minor units used by settlement strategies. */
internal fun BigDecimal.toMinorUnits(): Long = setScale(MONEY_SCALE, RoundingMode.UNNECESSARY)
    .multiply(MONEY_FACTOR)
    .longValueExact()

/** Converts fixed minor units back to scaled decimal money. */
internal fun Long.toMoneyAmount(): BigDecimal = BigDecimal.valueOf(this)
    .divide(MONEY_FACTOR)
    .setScale(MONEY_SCALE, RoundingMode.UNNECESSARY)
