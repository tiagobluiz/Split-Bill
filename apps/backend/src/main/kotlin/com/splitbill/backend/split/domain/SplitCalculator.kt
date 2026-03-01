package com.splitbill.backend.split.domain

import java.math.BigDecimal
import java.math.RoundingMode

class SplitCalculator {

    fun calculate(request: SplitCalculationRequest): SplitCalculationResult {
        val allocations = when (request.mode) {
            SplitMode.EVEN -> computeEven(request)
            SplitMode.PERCENT -> computePercent(request)
            SplitMode.AMOUNT -> computeAmount(request)
        }

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

    private fun computeEven(request: SplitCalculationRequest): List<ParticipantAllocation> {
        val ordered = request.participantSplits
            .map { it as EvenSplitInstruction }
            .sortedBy { it.participantId.value.toString() }
        val units = toUnits(request.totalAmount.value)
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
            ParticipantAllocation(it.participantId, DecimalAmount.of(fromUnits(unitShare)))
        }
    }

    private fun computePercent(request: SplitCalculationRequest): List<ParticipantAllocation> {
        val ordered = request.participantSplits
            .map { it as PercentSplitInstruction }
            .sortedBy { it.participantId.value.toString() }
        val totalUnits = toUnits(request.totalAmount.value)

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
            ParticipantAllocation(raw.participantId, DecimalAmount.of(fromUnits(finalUnits)))
        }
    }

    private fun computeAmount(request: SplitCalculationRequest): List<ParticipantAllocation> {
        return request.participantSplits
            .map { it as AmountSplitInstruction }
            .sortedBy { it.participantId.value.toString() }
            .map { ParticipantAllocation(it.participantId, it.amount) }
    }

    private fun toUnits(value: BigDecimal): Long {
        val scale = DecimalAmount.SCALE
        return value
            .setScale(scale, RoundingMode.UNNECESSARY)
            .movePointRight(scale)
            .longValueExact()
    }

    private fun fromUnits(units: Long): BigDecimal {
        val scale = DecimalAmount.SCALE
        return BigDecimal(units).movePointLeft(scale).setScale(scale, RoundingMode.UNNECESSARY)
    }
}
