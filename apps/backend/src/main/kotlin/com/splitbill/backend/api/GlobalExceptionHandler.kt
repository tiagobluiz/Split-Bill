package com.splitbill.backend.api

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.util.UUID

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ApiException::class)
    fun handleApiException(ex: ApiException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(ex.status).body(
            ErrorResponse(
                code = ex.code,
                message = ex.message,
                traceId = traceId(request),
                details = ex.details
            )
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest
    ): ResponseEntity<ValidationErrorResponse> {
        val errors = ex.bindingResult.fieldErrors.map {
            FieldErrorItem(field = it.field, message = it.defaultMessage ?: "Invalid value")
        }

        return ResponseEntity.badRequest().body(
            ValidationErrorResponse(
                code = "VALIDATION_ERROR",
                message = "Request validation failed",
                traceId = traceId(request),
                errors = errors
            )
        )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleNotReadable(
        ex: HttpMessageNotReadableException,
        request: HttpServletRequest
    ): ResponseEntity<ValidationErrorResponse> {
        return ResponseEntity.badRequest().body(
            ValidationErrorResponse(
                code = "VALIDATION_ERROR",
                message = "Request body is invalid",
                traceId = traceId(request),
                errors = listOf(FieldErrorItem(field = "body", message = "Malformed or invalid JSON"))
            )
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ErrorResponse(
                code = "INTERNAL_ERROR",
                message = "Unexpected server error",
                traceId = traceId(request)
            )
        )
    }

    private fun traceId(request: HttpServletRequest): String {
        return request.getHeader("X-Trace-Id")?.takeIf { it.isNotBlank() } ?: UUID.randomUUID().toString()
    }
}
