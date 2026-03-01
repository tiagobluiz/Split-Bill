package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EventRepository : JpaRepository<EventEntity, UUID> {
    fun findByIdAndArchivedAtIsNull(id: UUID): EventEntity?
    fun findAllByIdInAndArchivedAtIsNull(eventIds: Collection<UUID>): List<EventEntity>
}
