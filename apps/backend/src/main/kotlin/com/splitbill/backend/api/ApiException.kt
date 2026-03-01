package com.splitbill.backend.api

import org.springframework.http.HttpStatus

open class ApiException(
    val status: HttpStatus,
    val code: String,
    override val message: String,
    val details: Map<String, Any?>? = null
) : RuntimeException(message)
