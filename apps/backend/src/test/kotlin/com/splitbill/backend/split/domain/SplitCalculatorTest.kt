package com.splitbill.backend.split.domain

import java.math.BigDecimal
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class SplitCalculatorTest {

    private val calculator = SplitCalculator()

    @Test
    fun `even split is deterministic and preserves total`() {
        val request = SplitCalculationRequest.of(
            totalAmount = DecimalAmount.of(BigDecimal("10.0000")),
            currency = CurrencyCode.of("usd"),
            participantSplits = listOf(
                EvenSplitInstruction(pid(3)),
                EvenSplitInstruction(pid(1)),
                EvenSplitInstruction(pid(2))
            )
        )

        val result = calculator.calculate(request)

        assertEquals(CurrencyCode.of("USD"), result.currency)
        assertEquals(
            listOf(pid(1), pid(2), pid(3)),
            result.allocations.map { it.participantId }
        )
        assertEquals(
            listOf("3.3334", "3.3333", "3.3333"),
            result.allocations.map { it.amount.value.toPlainString() }
        )
        assertEquals("10.0000", result.allocations.sumOf { it.amount.value }.toPlainString())
    }

    @Test
    fun `percent split uses deterministic largest remainder on ties`() {
        val request = SplitCalculationRequest.of(
            totalAmount = DecimalAmount.of(BigDecimal("1.0001")),
            currency = CurrencyCode.of("USD"),
            participantSplits = listOf(
                PercentSplitInstruction(pid(2), Percentage.of(BigDecimal("50.00"))),
                PercentSplitInstruction(pid(1), Percentage.of(BigDecimal("50.00")))
            )
        )

        val result = calculator.calculate(request)

        assertEquals(
            listOf(pid(1), pid(2)),
            result.allocations.map { it.participantId }
        )
        assertEquals(
            listOf("0.5001", "0.5000"),
            result.allocations.map { it.amount.value.toPlainString() }
        )
        assertEquals("1.0001", result.allocations.sumOf { it.amount.value }.toPlainString())
    }

    @Test
    fun `amount split keeps explicit amounts and deterministic order`() {
        val request = SplitCalculationRequest.of(
            totalAmount = DecimalAmount.of(BigDecimal("7.5000")),
            currency = CurrencyCode.of("EUR"),
            participantSplits = listOf(
                AmountSplitInstruction(pid(3), DecimalAmount.of(BigDecimal("1.2500"))),
                AmountSplitInstruction(pid(1), DecimalAmount.of(BigDecimal("3.0000"))),
                AmountSplitInstruction(pid(2), DecimalAmount.of(BigDecimal("3.2500")))
            )
        )

        val result = calculator.calculate(request)

        assertEquals(
            listOf(pid(1), pid(2), pid(3)),
            result.allocations.map { it.participantId }
        )
        assertEquals(
            listOf("3.0000", "3.2500", "1.2500"),
            result.allocations.map { it.amount.value.toPlainString() }
        )
    }

    @Test
    fun `calculation is stable regardless of participant input order`() {
        val forward = SplitCalculationRequest.of(
            totalAmount = DecimalAmount.of(BigDecimal("10.0001")),
            currency = CurrencyCode.of("USD"),
            participantSplits = listOf(
                PercentSplitInstruction(pid(1), Percentage.of(BigDecimal("20.00"))),
                PercentSplitInstruction(pid(2), Percentage.of(BigDecimal("30.00"))),
                PercentSplitInstruction(pid(3), Percentage.of(BigDecimal("50.00")))
            )
        )
        val reverse = SplitCalculationRequest.of(
            totalAmount = DecimalAmount.of(BigDecimal("10.0001")),
            currency = CurrencyCode.of("USD"),
            participantSplits = listOf(
                PercentSplitInstruction(pid(3), Percentage.of(BigDecimal("50.00"))),
                PercentSplitInstruction(pid(2), Percentage.of(BigDecimal("30.00"))),
                PercentSplitInstruction(pid(1), Percentage.of(BigDecimal("20.00")))
            )
        )

        val forwardResult = calculator.calculate(forward)
        val reverseResult = calculator.calculate(reverse)

        assertEquals(
            forwardResult.allocations.map { it.participantId to it.amount.value.toPlainString() },
            reverseResult.allocations.map { it.participantId to it.amount.value.toPlainString() }
        )
    }

    @Test
    fun `request creation rejects invalid split invariants with actionable violations`() {
        val error = assertFailsWith<SplitValidationException> {
            SplitCalculationRequest.of(
                totalAmount = DecimalAmount.of(BigDecimal("10.0000")),
                currency = CurrencyCode.of("USD"),
                participantSplits = listOf(
                    EvenSplitInstruction(pid(1)),
                    AmountSplitInstruction(pid(1), DecimalAmount.of(BigDecimal("4.0000")))
                )
            )
        }

        assertTrue(error.violations.contains("participant ids must be unique"))
        assertTrue(error.violations.contains("all participant splits must use the same split mode"))
    }

    @Test
    fun `request creation rejects invalid percent and amount totals`() {
        val percentError = assertFailsWith<SplitValidationException> {
            SplitCalculationRequest.of(
                totalAmount = DecimalAmount.of(BigDecimal("10.0000")),
                currency = CurrencyCode.of("USD"),
                participantSplits = listOf(
                    PercentSplitInstruction(pid(1), Percentage.of(BigDecimal("60.00"))),
                    PercentSplitInstruction(pid(2), Percentage.of(BigDecimal("20.00")))
                )
            )
        }
        assertTrue(percentError.violations.contains("percent split total must be exactly 100.00"))

        val amountError = assertFailsWith<SplitValidationException> {
            SplitCalculationRequest.of(
                totalAmount = DecimalAmount.of(BigDecimal("10.0000")),
                currency = CurrencyCode.of("USD"),
                participantSplits = listOf(
                    AmountSplitInstruction(pid(1), DecimalAmount.of(BigDecimal("6.0000"))),
                    AmountSplitInstruction(pid(2), DecimalAmount.of(BigDecimal("3.0000")))
                )
            )
        }
        assertTrue(amountError.violations.contains("amount split total must match entry total"))
    }

    @Test
    fun `value objects enforce scale and bounds`() {
        assertFailsWith<IllegalArgumentException> {
            DecimalAmount.of(BigDecimal("1.23456"))
        }
        assertFailsWith<IllegalArgumentException> {
            Percentage.of(BigDecimal("100.01"))
        }
    }

    private fun pid(index: Int): ParticipantId {
        return ParticipantId.of(UUID.fromString("00000000-0000-0000-0000-00000000000$index"))
    }
}
