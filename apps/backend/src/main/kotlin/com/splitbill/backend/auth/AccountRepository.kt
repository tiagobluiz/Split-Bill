package com.splitbill.backend.auth

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface AccountRepository : JpaRepository<AccountEntity, UUID> {
    fun findByEmailIgnoreCase(email: String): AccountEntity?
}
