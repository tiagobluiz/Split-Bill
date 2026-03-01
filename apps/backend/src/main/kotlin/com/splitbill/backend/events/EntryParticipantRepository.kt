package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EntryParticipantRepository : JpaRepository<EntryParticipantEntity, UUID> {
    fun findAllByEntryIdOrderByCreatedAtAsc(entryId: UUID): List<EntryParticipantEntity>
    fun findAllByEntryIdIn(entryIds: List<UUID>): List<EntryParticipantEntity>
    fun deleteAllByEntryId(entryId: UUID)
}
