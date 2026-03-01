package com.splitbill.backend.events.settlement.domain

import java.math.BigDecimal
import java.math.RoundingMode

private const val MONEY_SCALE = 4
private val MONEY_FACTOR = BigDecimal.TEN.pow(MONEY_SCALE)

internal fun BigDecimal.toMinorUnits(): Long = setScale(MONEY_SCALE, RoundingMode.UNNECESSARY)
    .multiply(MONEY_FACTOR)
    .longValueExact()

internal fun Long.toMoneyAmount(): BigDecimal = BigDecimal.valueOf(this)
    .divide(MONEY_FACTOR)
    .setScale(MONEY_SCALE, RoundingMode.UNNECESSARY)
