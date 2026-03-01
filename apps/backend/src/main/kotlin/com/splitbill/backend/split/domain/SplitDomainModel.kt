package com.splitbill.backend.split.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Currency
import java.util.UUID

/**
 * Domain value object for ISO-4217 currency.
 * Backed by JVM [Currency] to reuse canonical code validation and normalization.
 */
@JvmInline
value class CurrencyCode private constructor(val value: Currency) {
    val code: String
        get() = value.currencyCode

    companion object {
        /** Creates a currency from either lower/upper-case ISO code input. */
        fun of(raw: String): CurrencyCode {
            val normalized = raw.trim().uppercase()
            val currency = runCatching { Currency.getInstance(normalized) }
                .getOrElse {
                    throw IllegalArgumentException("currency must be a valid ISO-4217 code")
                }
            return CurrencyCode(currency)
        }

        /** Creates a currency from an existing JVM currency instance. */
        fun of(currency: Currency): CurrencyCode {
            require(currency.currencyCode.matches(Regex("^[A-Z]{3}$"))) {
                "currency must be a 3-letter uppercase ISO code"
            }
            return CurrencyCode(currency)
        }
    }
}

/** Domain identifier for split participants. */
@JvmInline
value class ParticipantId private constructor(val value: UUID) {
    companion object {
        fun of(value: UUID): ParticipantId = ParticipantId(value)
    }
}

/** Fixed-scale decimal amount used for money calculations in split domain. */
@JvmInline
value class DecimalAmount private constructor(val value: BigDecimal) {
    companion object {
        const val SCALE = 4

        /** Creates amount with exact [SCALE] decimals and no implicit rounding. */
        fun of(raw: BigDecimal): DecimalAmount {
            val scaled = try {
                raw.setScale(SCALE, RoundingMode.UNNECESSARY)
            } catch (_: ArithmeticException) {
                throw IllegalArgumentException("amount must have scale $SCALE")
            }
            return DecimalAmount(scaled)
        }

        /** Creates amount constrained to strictly positive values. */
        fun positive(raw: BigDecimal): DecimalAmount {
            val amount = of(raw)
            require(amount.value > BigDecimal.ZERO) { "amount must be greater than zero" }
            return amount
        }
    }
}

/** Percentage in split instructions, constrained to 0 < value <= 100.00. */
@JvmInline
value class Percentage private constructor(val value: BigDecimal) {
    companion object {
        private const val SCALE = 2
        private val HUNDRED = BigDecimal("100.00")

        /** Creates a percentage with exact [SCALE] decimals and bounded range. */
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

/** Supported split calculation modes in current domain. */
enum class SplitMode {
    EVEN,
    PERCENT,
    AMOUNT
}

/** Per-participant split instruction contract. */
sealed interface ParticipantSplitInstruction {
    val participantId: ParticipantId
    val mode: SplitMode
}

/** Participant included in deterministic even split. */
data class EvenSplitInstruction(
    override val participantId: ParticipantId
) : ParticipantSplitInstruction {
    override val mode: SplitMode = SplitMode.EVEN
}

/** Participant percentage assignment for percentage split mode. */
data class PercentSplitInstruction(
    override val participantId: ParticipantId,
    val percent: Percentage
) : ParticipantSplitInstruction {
    override val mode: SplitMode = SplitMode.PERCENT
}

/** Participant fixed amount assignment for explicit amount split mode. */
data class AmountSplitInstruction(
    override val participantId: ParticipantId,
    val amount: DecimalAmount
) : ParticipantSplitInstruction {
    override val mode: SplitMode = SplitMode.AMOUNT
}

/**
 * Aggregate root for split calculation input.
 * Constructed only through [of] so invariants stay enforceable.
 */
class SplitCalculationRequest private constructor(
    val totalAmount: DecimalAmount,
    val currency: CurrencyCode,
    val mode: SplitMode,
    val participantSplits: List<ParticipantSplitInstruction>
) {
    companion object {
        private val HUNDRED = BigDecimal("100.00")

        /**
         * Validates and creates an immutable split request.
         * Enforces same-mode, unique participant, and mode-specific total invariants.
         */
        fun of(
            totalAmount: DecimalAmount,
            currency: CurrencyCode,
            participantSplits: List<ParticipantSplitInstruction>
        ): SplitCalculationRequest {
            val immutableParticipantSplits = participantSplits.toList()
            val violations = mutableListOf<String>()

            if (totalAmount.value <= BigDecimal.ZERO) {
                violations += "total amount must be greater than zero"
            }
            if (immutableParticipantSplits.isEmpty()) {
                violations += "at least one participant split is required"
            }

            val distinctIds = immutableParticipantSplits.map { it.participantId.value }.toSet().size
            if (distinctIds != immutableParticipantSplits.size) {
                violations += "participant ids must be unique"
            }

            val modes = immutableParticipantSplits.map { it.mode }.toSet()
            if (modes.size > 1) {
                violations += "all participant splits must use the same split mode"
            }

            if (modes.size == 1) {
                when (modes.first()) {
                    SplitMode.PERCENT -> validatePercentMode(immutableParticipantSplits, violations)
                    SplitMode.AMOUNT -> validateAmountMode(totalAmount, immutableParticipantSplits, violations)
                    SplitMode.EVEN -> Unit
                }
            }

            if (violations.isNotEmpty()) {
                throw SplitValidationException(violations)
            }

            return SplitCalculationRequest(
                totalAmount = totalAmount,
                currency = currency,
                mode = immutableParticipantSplits.first().mode,
                participantSplits = immutableParticipantSplits
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

/** Final money allocation for a participant after split calculation. */
data class ParticipantAllocation(
    val participantId: ParticipantId,
    val amount: DecimalAmount
)

/** Domain result object carrying validated split allocations. */
data class SplitCalculationResult(
    val totalAmount: DecimalAmount,
    val currency: CurrencyCode,
    val allocations: List<ParticipantAllocation>
)

/** Domain validation error with one or more actionable violations. */
class SplitValidationException(
    val violations: List<String>
) : RuntimeException(violations.joinToString("; "))
