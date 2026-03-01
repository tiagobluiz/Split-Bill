package com.splitbill.backend.events

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "invite_tokens")
class InviteTokenEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID? = null,

    @Column(name = "token_hash", nullable = false)
    var tokenHash: String? = null,

    @Column(name = "created_by_account_id", nullable = false)
    var createdByAccountId: UUID? = null,

    @Column(name = "expires_at")
    var expiresAt: Instant? = null,

    @Column(name = "revoked_at")
    var revokedAt: Instant? = null
)
