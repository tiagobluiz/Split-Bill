package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EventPersonRepository : JpaRepository<EventPersonEntity, UUID> {
    fun existsByIdAndEventId(id: UUID, eventId: UUID): Boolean
    fun findAllByEventIdOrderByCreatedAtAsc(eventId: UUID): List<EventPersonEntity>
    fun findByIdAndEventId(id: UUID, eventId: UUID): EventPersonEntity?
}
