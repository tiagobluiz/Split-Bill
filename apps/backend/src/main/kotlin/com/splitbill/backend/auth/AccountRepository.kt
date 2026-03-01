package com.splitbill.backend.auth

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Repository
class AccountRepository(
    private val jdbcTemplate: JdbcTemplate
) {

    private val mapper = RowMapper { rs, _ ->
        AccountRecord(
            id = rs.getObject("id", UUID::class.java),
            email = rs.getString("email"),
            passwordHash = rs.getString("password_hash"),
            name = rs.getString("name"),
            preferredCurrency = rs.getString("preferred_currency"),
            emailVerifiedAt = rs.getTimestamp("email_verified_at")?.toInstant()
        )
    }

    fun createAccount(email: String, passwordHash: String, name: String, preferredCurrency: String): AccountRecord {
        val id = UUID.randomUUID()
        jdbcTemplate.update(
            """
            INSERT INTO accounts (id, email, password_hash, name, preferred_currency)
            VALUES (?, ?, ?, ?, ?)
            """.trimIndent(),
            id,
            email,
            passwordHash,
            name,
            preferredCurrency
        )
        return findById(id) ?: error("Account insert failed")
    }

    fun findByEmail(email: String): AccountRecord? {
        val rows = jdbcTemplate.query(
            """
            SELECT id, email, password_hash, name, preferred_currency, email_verified_at
            FROM accounts
            WHERE lower(email) = lower(?)
            """.trimIndent(),
            mapper,
            email
        )
        return rows.firstOrNull()
    }

    fun findById(accountId: UUID): AccountRecord? {
        val rows = jdbcTemplate.query(
            """
            SELECT id, email, password_hash, name, preferred_currency, email_verified_at
            FROM accounts
            WHERE id = ?
            """.trimIndent(),
            mapper,
            accountId
        )
        return rows.firstOrNull()
    }

    fun verifyEmail(accountId: UUID): Boolean {
        val updated = jdbcTemplate.update(
            """
            UPDATE accounts
            SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ?
            WHERE id = ?
            """.trimIndent(),
            Timestamp.from(Instant.now()),
            Timestamp.from(Instant.now()),
            accountId
        )
        return updated > 0
    }

    fun updatePreferences(accountId: UUID, preferredCurrency: String?, timezone: String?) {
        if (preferredCurrency == null && timezone == null) {
            return
        }

        if (preferredCurrency != null) {
            jdbcTemplate.update(
                """
                UPDATE accounts
                SET preferred_currency = ?, updated_at = ?
                WHERE id = ?
                """.trimIndent(),
                preferredCurrency,
                Timestamp.from(Instant.now()),
                accountId
            )
        }
    }
}
