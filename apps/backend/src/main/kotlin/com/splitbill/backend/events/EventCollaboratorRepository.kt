package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EventCollaboratorRepository : JpaRepository<EventCollaboratorEntity, UUID> {
    fun existsByEventIdAndAccountId(eventId: UUID, accountId: UUID): Boolean
    fun findAllByAccountId(accountId: UUID): List<EventCollaboratorEntity>
    fun findAllByEventId(eventId: UUID): List<EventCollaboratorEntity>
}
