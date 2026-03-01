package com.splitbill.backend.split.application

import com.splitbill.backend.split.domain.SplitCalculationRequest
import com.splitbill.backend.split.domain.SplitCalculationResult
import com.splitbill.backend.split.domain.SplitCalculator

class SplitCalculationApplicationService(
    private val splitCalculator: SplitCalculator = SplitCalculator()
) {
    fun calculate(request: SplitCalculationRequest): SplitCalculationResult {
        return splitCalculator.calculate(request)
    }
}
