package com.splitbill.backend.split.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

@JvmInline
value class CurrencyCode private constructor(val value: String) {
    companion object {
        fun of(raw: String): CurrencyCode {
            val normalized = raw.trim().uppercase()
            require(normalized.matches(Regex("^[A-Z]{3}$"))) {
                "currency must be a 3-letter uppercase ISO code"
            }
            return CurrencyCode(normalized)
        }
    }
}

@JvmInline
value class ParticipantId private constructor(val value: UUID) {
    companion object {
        fun of(value: UUID): ParticipantId = ParticipantId(value)
    }
}

@JvmInline
value class DecimalAmount private constructor(val value: BigDecimal) {
    companion object {
        const val SCALE = 4

        fun of(raw: BigDecimal): DecimalAmount {
            val scaled = try {
                raw.setScale(SCALE, RoundingMode.UNNECESSARY)
            } catch (_: ArithmeticException) {
                throw IllegalArgumentException("amount must have scale $SCALE")
            }
            return DecimalAmount(scaled)
        }

        fun positive(raw: BigDecimal): DecimalAmount {
            val amount = of(raw)
            require(amount.value > BigDecimal.ZERO) { "amount must be greater than zero" }
            return amount
        }
    }
}

@JvmInline
value class Percentage private constructor(val value: BigDecimal) {
    companion object {
        private const val SCALE = 2
        private val HUNDRED = BigDecimal("100.00")

        fun of(raw: BigDecimal): Percentage {
            val scaled = try {
                raw.setScale(SCALE, RoundingMode.UNNECESSARY)
            } catch (_: ArithmeticException) {
                throw IllegalArgumentException("percent must have scale $SCALE")
            }
            require(scaled > BigDecimal.ZERO) { "percent must be greater than zero" }
            require(scaled <= HUNDRED) { "percent must be less than or equal to 100.00" }
            return Percentage(scaled)
        }
    }
}

enum class SplitMode {
    EVEN,
    PERCENT,
    AMOUNT
}

sealed interface ParticipantSplitInstruction {
    val participantId: ParticipantId
    val mode: SplitMode
}

data class EvenSplitInstruction(
    override val participantId: ParticipantId
) : ParticipantSplitInstruction {
    override val mode: SplitMode = SplitMode.EVEN
}

data class PercentSplitInstruction(
    override val participantId: ParticipantId,
    val percent: Percentage
) : ParticipantSplitInstruction {
    override val mode: SplitMode = SplitMode.PERCENT
}

data class AmountSplitInstruction(
    override val participantId: ParticipantId,
    val amount: DecimalAmount
) : ParticipantSplitInstruction {
    override val mode: SplitMode = SplitMode.AMOUNT
}

class SplitCalculationRequest private constructor(
    val totalAmount: DecimalAmount,
    val currency: CurrencyCode,
    val mode: SplitMode,
    val participantSplits: List<ParticipantSplitInstruction>
) {
    companion object {
        private val HUNDRED = BigDecimal("100.00")

        fun of(
            totalAmount: DecimalAmount,
            currency: CurrencyCode,
            participantSplits: List<ParticipantSplitInstruction>
        ): SplitCalculationRequest {
            val violations = mutableListOf<String>()

            if (totalAmount.value <= BigDecimal.ZERO) {
                violations += "total amount must be greater than zero"
            }
            if (participantSplits.isEmpty()) {
                violations += "at least one participant split is required"
            }

            val distinctIds = participantSplits.map { it.participantId.value }.toSet().size
            if (distinctIds != participantSplits.size) {
                violations += "participant ids must be unique"
            }

            val modes = participantSplits.map { it.mode }.toSet()
            if (modes.size > 1) {
                violations += "all participant splits must use the same split mode"
            }

            if (modes.size == 1) {
                when (modes.first()) {
                    SplitMode.PERCENT -> validatePercentMode(participantSplits, violations)
                    SplitMode.AMOUNT -> validateAmountMode(totalAmount, participantSplits, violations)
                    SplitMode.EVEN -> Unit
                }
            }

            if (violations.isNotEmpty()) {
                throw SplitValidationException(violations)
            }

            return SplitCalculationRequest(
                totalAmount = totalAmount,
                currency = currency,
                mode = participantSplits.first().mode,
                participantSplits = participantSplits
            )
        }

        private fun validatePercentMode(
            instructions: List<ParticipantSplitInstruction>,
            violations: MutableList<String>
        ) {
            val percentInstructions = instructions.map { it as PercentSplitInstruction }
            val sumPercent = percentInstructions.fold(BigDecimal.ZERO) { acc, i -> acc + i.percent.value }
            if (sumPercent.compareTo(HUNDRED) != 0) {
                violations += "percent split total must be exactly 100.00"
            }
        }

        private fun validateAmountMode(
            total: DecimalAmount,
            instructions: List<ParticipantSplitInstruction>,
            violations: MutableList<String>
        ) {
            val amountInstructions = instructions.map { it as AmountSplitInstruction }
            val sumAmount = amountInstructions.fold(BigDecimal.ZERO) { acc, i -> acc + i.amount.value }
            if (sumAmount.compareTo(total.value) != 0) {
                violations += "amount split total must match entry total"
            }
        }
    }
}

data class ParticipantAllocation(
    val participantId: ParticipantId,
    val amount: DecimalAmount
)

data class SplitCalculationResult(
    val totalAmount: DecimalAmount,
    val currency: CurrencyCode,
    val allocations: List<ParticipantAllocation>
)

class SplitValidationException(
    val violations: List<String>
) : RuntimeException(violations.joinToString("; "))
