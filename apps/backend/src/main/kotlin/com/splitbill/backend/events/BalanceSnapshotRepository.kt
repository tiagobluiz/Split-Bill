package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface BalanceSnapshotRepository : JpaRepository<BalanceSnapshotEntity, UUID> {
    fun deleteAllByEventId(eventId: UUID)
    fun findAllByEventIdOrderByPersonIdAsc(eventId: UUID): List<BalanceSnapshotEntity>
}
