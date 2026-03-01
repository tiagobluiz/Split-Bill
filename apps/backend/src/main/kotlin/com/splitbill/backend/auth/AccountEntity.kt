package com.splitbill.backend.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "accounts")
class AccountEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "email", nullable = false)
    var email: String? = null,

    @Column(name = "password_hash", nullable = false)
    var passwordHash: String? = null,

    @Column(name = "name", nullable = false)
    var name: String? = null,

    @Column(name = "preferred_currency", nullable = false)
    var preferredCurrency: String? = null,

    @Column(name = "email_verified_at")
    var emailVerifiedAt: Instant? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null
)
