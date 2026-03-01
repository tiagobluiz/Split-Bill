package com.splitbill.backend.events

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "event_people")
class EventPersonEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID? = null,

    @Column(name = "display_name", nullable = false)
    var displayName: String? = null,

    @Column(name = "created_by_account_id", nullable = false)
    var createdByAccountId: UUID? = null
)
