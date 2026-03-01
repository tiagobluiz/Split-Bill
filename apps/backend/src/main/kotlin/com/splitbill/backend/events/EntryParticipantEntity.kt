package com.splitbill.backend.events

import com.splitbill.backend.split.domain.SplitMode
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "entry_participants",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uq_entry_participants_entry_person",
            columnNames = ["entry_id", "person_id"]
        )
    ],
    indexes = [
        Index(name = "idx_entry_participants_entry", columnList = "entry_id")
    ]
)
class EntryParticipantEntity(
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID? = null,

    @Column(name = "entry_id", nullable = false)
    var entryId: UUID? = null,

    @Column(name = "person_id", nullable = false)
    var personId: UUID? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "split_mode", nullable = false)
    var splitMode: SplitMode? = null,

    @Column(name = "split_percent", precision = 7, scale = 4)
    var splitPercent: BigDecimal? = null,

    @Column(name = "split_amount", precision = 19, scale = 4)
    var splitAmount: BigDecimal? = null,

    @Column(name = "resolved_event_amount", nullable = false, precision = 19, scale = 4)
    var resolvedEventAmount: BigDecimal? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant? = null
)
