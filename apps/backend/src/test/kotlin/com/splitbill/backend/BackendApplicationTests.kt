package com.splitbill.backend

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import java.sql.Timestamp
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFailsWith

@Import(TestcontainersConfiguration::class)
@SpringBootTest
class BackendApplicationTests(
	@Autowired private val jdbcTemplate: JdbcTemplate,
	@Autowired private val flyway: Flyway
) {

	@Test
	fun `creates all authoritative schema tables`() {
		val existingTables = jdbcTemplate.queryForList(
			"""
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			""".trimIndent(),
			String::class.java
		).toSet()

		val requiredTables = setOf(
			"accounts",
			"events",
			"event_collaborators",
			"event_people",
			"event_categories",
			"invite_tokens",
			"entries",
			"entry_participants",
			"entry_receipts",
			"fx_rates",
			"balance_snapshots",
			"audit_log"
		)

		val missingTables = requiredTables - existingTables
		assertTrue(missingTables.isEmpty(), "Missing tables: $missingTables")
	}

	@Test
	fun `enforces unique account email`() {
		insertAccount(email = "owner@splitbill.test")
		assertFailsWith<DataIntegrityViolationException> {
			insertAccount(email = "owner@splitbill.test")
		}
	}

	@Test
	fun `enforces unique collaborator membership per event`() {
		val ownerId = insertAccount(email = "owner-collab@splitbill.test")
		val collaboratorId = insertAccount(email = "collab@splitbill.test")
		val eventId = insertEvent(ownerId)

		insertEventCollaborator(eventId, collaboratorId)
		assertFailsWith<DataIntegrityViolationException> {
			insertEventCollaborator(eventId, collaboratorId)
		}
	}

	@Test
	fun `rejects invalid entry type`() {
		val ownerId = insertAccount(email = "owner-entry-type@splitbill.test")
		val eventId = insertEvent(ownerId)
		val payerPersonId = insertEventPerson(eventId, ownerId)
		val categoryId = insertCategory(eventId, "Food")

		assertFailsWith<DataIntegrityViolationException> {
			jdbcTemplate.update(
				"""
				INSERT INTO entries (
					id, event_id, type, name, category_id, amount, currency, event_amount,
					payer_person_id, occurred_at_utc, created_by_account_id
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""".trimIndent(),
				UUID.randomUUID(),
				eventId,
				"INVALID",
				"Dinner",
				categoryId,
				BigDecimal("20.00"),
				"USD",
				BigDecimal("20.00"),
				payerPersonId,
				Timestamp.from(Instant.now()),
				ownerId
			)
		}
	}

	@Test
	fun `rejects duplicate person mapping for same account in event`() {
		val ownerId = insertAccount(email = "owner-map@splitbill.test")
		val linkedAccountId = insertAccount(email = "linked-map@splitbill.test")
		val eventId = insertEvent(ownerId)

		insertEventPerson(eventId, ownerId, linkedAccountId)
		assertFailsWith<DataIntegrityViolationException> {
			insertEventPerson(eventId, ownerId, linkedAccountId)
		}
	}

	@Test
	fun `supports repeatable migration runs on an existing schema`() {
		val result = flyway.migrate()
		assertEquals(0, result.migrationsExecuted)
	}

	@Test
	fun `enforces fx rate uniqueness by provider currency pair and date`() {
		insertFxRate(provider = "ECB", baseCurrency = "USD", quoteCurrency = "BRL", rateDate = LocalDate.of(2026, 2, 20))
		assertFailsWith<DataIntegrityViolationException> {
			insertFxRate(provider = "ECB", baseCurrency = "USD", quoteCurrency = "BRL", rateDate = LocalDate.of(2026, 2, 20))
		}
	}

	private fun insertAccount(email: String): UUID {
		val id = UUID.randomUUID()
		jdbcTemplate.update(
			"""
			INSERT INTO accounts (id, email, password_hash, name, preferred_currency)
			VALUES (?, ?, ?, ?, ?)
			""".trimIndent(),
			id,
			email,
			"hash",
			"Account",
			"USD"
		)
		return id
	}

	private fun insertEvent(ownerId: UUID): UUID {
		val id = UUID.randomUUID()
		jdbcTemplate.update(
			"""
			INSERT INTO events (id, owner_account_id, name, base_currency, timezone, default_settlement_algorithm)
			VALUES (?, ?, ?, ?, ?, ?)
			""".trimIndent(),
			id,
			ownerId,
			"Summer Trip",
			"USD",
			"UTC",
			"MIN_TRANSFER"
		)
		return id
	}

	private fun insertEventCollaborator(eventId: UUID, accountId: UUID): UUID {
		val id = UUID.randomUUID()
		jdbcTemplate.update(
			"""
			INSERT INTO event_collaborators (id, event_id, account_id, role)
			VALUES (?, ?, ?, ?)
			""".trimIndent(),
			id,
			eventId,
			accountId,
			"COLLABORATOR"
		)
		return id
	}

	private fun insertEventPerson(eventId: UUID, createdByAccountId: UUID, linkedAccountId: UUID? = null): UUID {
		val id = UUID.randomUUID()
		jdbcTemplate.update(
			"""
			INSERT INTO event_people (id, event_id, display_name, linked_account_id, created_by_account_id)
			VALUES (?, ?, ?, ?, ?)
			""".trimIndent(),
			id,
			eventId,
			"Alex",
			linkedAccountId,
			createdByAccountId
		)
		return id
	}

	private fun insertCategory(eventId: UUID, name: String): UUID {
		val id = UUID.randomUUID()
		jdbcTemplate.update(
			"""
			INSERT INTO event_categories (id, event_id, name, is_default)
			VALUES (?, ?, ?, ?)
			""".trimIndent(),
			id,
			eventId,
			name,
			false
		)
		return id
	}

	private fun insertFxRate(provider: String, baseCurrency: String, quoteCurrency: String, rateDate: LocalDate): UUID {
		val id = UUID.randomUUID()
		jdbcTemplate.update(
			"""
			INSERT INTO fx_rates (id, provider, base_currency, quote_currency, rate, rate_date, fetched_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			""".trimIndent(),
			id,
			provider,
			baseCurrency,
			quoteCurrency,
			BigDecimal("5.12000000"),
			rateDate,
			Timestamp.from(Instant.now())
		)
		return id
	}

}
