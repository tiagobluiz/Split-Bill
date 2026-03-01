package com.splitbill.backend.events

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "balance_snapshots")
class BalanceSnapshotEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID? = null,

    @Column(name = "person_id", nullable = false)
    var personId: UUID? = null,

    @Column(name = "net_amount", nullable = false, precision = 19, scale = 4)
    var netAmount: BigDecimal? = null,

    @Column(name = "computed_at", nullable = false)
    var computedAt: Instant? = null
)
