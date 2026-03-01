package com.splitbill.backend.events

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface InviteTokenRepository : JpaRepository<InviteTokenEntity, UUID> {
    fun findByTokenHashAndRevokedAtIsNull(tokenHash: String): InviteTokenEntity?
}
