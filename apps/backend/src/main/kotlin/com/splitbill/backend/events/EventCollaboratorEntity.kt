package com.splitbill.backend.events

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "event_collaborators")
class EventCollaboratorEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID? = null,

    @Column(name = "account_id", nullable = false)
    var accountId: UUID? = null,

    @Column(name = "role", nullable = false)
    var role: String? = null,

    @Column(name = "joined_at", nullable = false)
    var joinedAt: Instant? = null
)
