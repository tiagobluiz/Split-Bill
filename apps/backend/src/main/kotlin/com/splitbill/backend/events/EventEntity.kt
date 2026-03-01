package com.splitbill.backend.events

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "events")
class EventEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "owner_account_id", nullable = false)
    var ownerAccountId: UUID? = null,

    @Column(name = "name", nullable = false)
    var name: String? = null,

    @Column(name = "base_currency", nullable = false)
    var baseCurrency: String? = null,

    @Column(name = "timezone", nullable = false)
    var timezone: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "default_settlement_algorithm", nullable = false)
    var defaultSettlementAlgorithm: SettlementAlgorithm? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null,

    @Column(name = "archived_at")
    var archivedAt: Instant? = null
)
