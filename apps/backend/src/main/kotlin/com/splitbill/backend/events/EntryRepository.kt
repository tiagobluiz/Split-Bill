package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EntryRepository : JpaRepository<EntryEntity, UUID> {
    fun findByIdAndEventIdAndDeletedAtIsNull(id: UUID, eventId: UUID): EntryEntity?
    fun findAllByEventIdAndDeletedAtIsNullOrderByOccurredAtUtcDescCreatedAtDescIdDesc(eventId: UUID): List<EntryEntity>
}
