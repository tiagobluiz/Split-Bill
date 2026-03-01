package com.splitbill.backend.split.domain

import java.math.BigDecimal
import java.math.RoundingMode

/** Strategy contract for mode-specific split allocation. */
interface SplitModeCalculator {
    val mode: SplitMode
    fun calculateAllocations(request: SplitCalculationRequest): List<ParticipantAllocation>
}

/** Domain service orchestrating mode strategies and preserving split invariants. */
class SplitCalculator(
    calculators: List<SplitModeCalculator> = listOf(
        EvenSplitModeCalculator(),
        PercentSplitModeCalculator(),
        AmountSplitModeCalculator()
    )
) {
    private val calculatorsByMode = calculators.associateBy { it.mode }

    init {
        require(calculatorsByMode.keys == SplitMode.entries.toSet()) {
            "a split mode calculator must be provided for every supported split mode"
        }
    }

    /** Calculates per-participant allocations and guarantees total preservation. */
    fun calculate(request: SplitCalculationRequest): SplitCalculationResult {
        val modeCalculator = calculatorsByMode[request.mode]
            ?: throw SplitValidationException(listOf("unsupported split mode: ${request.mode}"))
        val allocations = modeCalculator.calculateAllocations(request)

        val sum = allocations.fold(BigDecimal.ZERO) { acc, a -> acc + a.amount.value }
        if (sum.compareTo(request.totalAmount.value) != 0) {
            throw SplitValidationException(listOf("computed allocations do not match total amount"))
        }

        return SplitCalculationResult(
            totalAmount = request.totalAmount,
            currency = request.currency,
            allocations = allocations
        )
    }
}

/** Strategy for deterministic even split with remainder distribution. */
class EvenSplitModeCalculator : SplitModeCalculator {
    override val mode: SplitMode = SplitMode.EVEN

    override fun calculateAllocations(request: SplitCalculationRequest): List<ParticipantAllocation> {
        val ordered = request.participantSplits
            .map { it as EvenSplitInstruction }
            .sortedBy { it.participantId.value.toString() }
        val units = SplitUnitConverter.toUnits(request.totalAmount.value)
        val count = ordered.size.toLong()
        val base = units / count
        var remainder = units % count

        return ordered.map {
            val unitShare = if (remainder > 0) {
                remainder -= 1
                base + 1
            } else {
                base
            }
            ParticipantAllocation(it.participantId, DecimalAmount.of(SplitUnitConverter.fromUnits(unitShare)))
        }
    }
}

/** Strategy for deterministic percent split using largest-remainder policy. */
class PercentSplitModeCalculator : SplitModeCalculator {
    override val mode: SplitMode = SplitMode.PERCENT

    override fun calculateAllocations(request: SplitCalculationRequest): List<ParticipantAllocation> {
        val ordered = request.participantSplits
            .map { it as PercentSplitInstruction }
            .sortedBy { it.participantId.value.toString() }
        val totalUnits = SplitUnitConverter.toUnits(request.totalAmount.value)

        data class Raw(val participantId: ParticipantId, val floor: Long, val remainder: BigDecimal)

        val rawParts = ordered.map { instruction ->
            val exactUnits = BigDecimal(totalUnits)
                .multiply(instruction.percent.value)
                .divide(BigDecimal("100.00"), 12, RoundingMode.DOWN)
            val floor = exactUnits.setScale(0, RoundingMode.DOWN).longValueExact()
            Raw(
                participantId = instruction.participantId,
                floor = floor,
                remainder = exactUnits.subtract(BigDecimal(floor))
            )
        }

        val floorSum = rawParts.sumOf { it.floor }
        var remainderUnits = totalUnits - floorSum

        val remainderOrder = rawParts.sortedWith(
            compareByDescending<Raw> { it.remainder }
                .thenBy { it.participantId.value.toString() }
        )

        val bonusByParticipant = mutableMapOf<ParticipantId, Long>()
        for (raw in remainderOrder) {
            if (remainderUnits == 0L) break
            bonusByParticipant[raw.participantId] = (bonusByParticipant[raw.participantId] ?: 0L) + 1L
            remainderUnits -= 1L
        }

        return rawParts.map { raw ->
            val finalUnits = raw.floor + (bonusByParticipant[raw.participantId] ?: 0L)
            ParticipantAllocation(raw.participantId, DecimalAmount.of(SplitUnitConverter.fromUnits(finalUnits)))
        }
    }
}

/** Strategy for deterministic fixed-amount split. */
class AmountSplitModeCalculator : SplitModeCalculator {
    override val mode: SplitMode = SplitMode.AMOUNT

    override fun calculateAllocations(request: SplitCalculationRequest): List<ParticipantAllocation> {
        return request.participantSplits
            .map { it as AmountSplitInstruction }
            .sortedBy { it.participantId.value.toString() }
            .map { ParticipantAllocation(it.participantId, it.amount) }
    }
}

private object SplitUnitConverter {
    fun toUnits(value: BigDecimal): Long {
        val scale = DecimalAmount.SCALE
        return value
            .setScale(scale, RoundingMode.UNNECESSARY)
            .movePointRight(scale)
            .longValueExact()
    }

    fun fromUnits(units: Long): BigDecimal {
        val scale = DecimalAmount.SCALE
        return BigDecimal(units).movePointLeft(scale).setScale(scale, RoundingMode.UNNECESSARY)
    }
}
