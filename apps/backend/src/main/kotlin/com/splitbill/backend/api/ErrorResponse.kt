package com.splitbill.backend.api

data class ErrorResponse(
    val code: String,
    val message: String,
    val traceId: String,
    val details: Map<String, Any?>? = null
)

data class FieldErrorItem(
    val field: String,
    val message: String
)

data class ValidationErrorResponse(
    val code: String,
    val message: String,
    val traceId: String,
    val details: Map<String, Any?>? = null,
    val errors: List<FieldErrorItem>
)
