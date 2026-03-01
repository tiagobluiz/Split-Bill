package com.splitbill.backend.auth

import java.time.Instant
import java.util.UUID

data class AccountRecord(
    val id: UUID,
    val email: String,
    val passwordHash: String,
    val name: String,
    val preferredCurrency: String,
    val emailVerifiedAt: Instant?
) {
    val emailVerified: Boolean
        get() = emailVerifiedAt != null
}
