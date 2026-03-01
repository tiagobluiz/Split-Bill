package com.splitbill.backend.events

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

enum class EntryType {
    EXPENSE,
    INCOME
}

@Entity
@Table(name = "entries")
class EntryEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    var type: EntryType? = null,

    @Column(name = "name", nullable = false)
    var name: String? = null,

    @Column(name = "category_id")
    var categoryId: UUID? = null,

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    var amount: BigDecimal? = null,

    @Column(name = "currency", nullable = false)
    var currency: String? = null,

    @Column(name = "event_amount", nullable = false, precision = 19, scale = 4)
    var eventAmount: BigDecimal? = null,

    @Column(name = "payer_person_id", nullable = false)
    var payerPersonId: UUID? = null,

    @Column(name = "occurred_at_utc", nullable = false)
    var occurredAtUtc: Instant? = null,

    @Column(name = "fx_rate_snapshot", precision = 19, scale = 8)
    var fxRateSnapshot: BigDecimal? = null,

    @Column(name = "fx_source")
    var fxSource: String? = null,

    @Column(name = "note")
    var note: String? = null,

    @Column(name = "created_by_account_id", nullable = false)
    var createdByAccountId: UUID? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant? = null,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null,

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
)
