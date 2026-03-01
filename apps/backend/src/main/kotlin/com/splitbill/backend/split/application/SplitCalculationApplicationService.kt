package com.splitbill.backend.split.application

import com.splitbill.backend.split.domain.SplitCalculationRequest
import com.splitbill.backend.split.domain.SplitCalculationResult
import com.splitbill.backend.split.domain.SplitCalculator
import org.springframework.stereotype.Service

/** Application-layer service composing split domain calculator into Spring use cases. */
@Service
class SplitCalculationApplicationService(
    private val splitCalculator: SplitCalculator = SplitCalculator()
) {
    /** Executes split calculation using validated domain request. */
    fun calculate(request: SplitCalculationRequest): SplitCalculationResult {
        return splitCalculator.calculate(request)
    }
}
