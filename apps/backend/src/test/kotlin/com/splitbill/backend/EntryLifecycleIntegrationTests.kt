package com.splitbill.backend

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.splitbill.backend.auth.AccountRepository
import com.splitbill.backend.events.BalanceSnapshotRepository
import com.splitbill.backend.events.EntryParticipantRepository
import com.splitbill.backend.events.EntryRepository
import com.splitbill.backend.events.EventCollaboratorRepository
import com.splitbill.backend.events.EventPersonRepository
import com.splitbill.backend.events.EventRepository
import com.splitbill.backend.events.InviteTokenRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.UUID

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@AutoConfigureMockMvc
class EntryLifecycleIntegrationTests(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val accountRepository: AccountRepository,
    @Autowired private val eventRepository: EventRepository,
    @Autowired private val eventCollaboratorRepository: EventCollaboratorRepository,
    @Autowired private val eventPersonRepository: EventPersonRepository,
    @Autowired private val inviteTokenRepository: InviteTokenRepository,
    @Autowired private val entryRepository: EntryRepository,
    @Autowired private val entryParticipantRepository: EntryParticipantRepository,
    @Autowired private val balanceSnapshotRepository: BalanceSnapshotRepository
) {
    private val objectMapper = ObjectMapper().findAndRegisterModules()

    @BeforeEach
    fun setup() {
        entryParticipantRepository.deleteAllInBatch()
        entryRepository.deleteAllInBatch()
        balanceSnapshotRepository.deleteAllInBatch()
        eventCollaboratorRepository.deleteAllInBatch()
        eventPersonRepository.deleteAllInBatch()
        inviteTokenRepository.deleteAllInBatch()
        eventRepository.deleteAllInBatch()
        accountRepository.deleteAllInBatch()
    }

    @Test
    fun `expense entry with subset participants recomputes balances immediately`() {
        val owner = registerAndVerify("owner-entry-expense@splitbill.test")
        val token = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(token, "Entry Expense")
        val alice = createPerson(token, eventId, "Alice")
        val bob = createPerson(token, eventId, "Bob")
        val carol = createPerson(token, eventId, "Carol")

        mockMvc.perform(
            post("/events/$eventId/entries")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "type" to "EXPENSE",
                            "name" to "Dinner",
                            "amount" to "12.0000",
                            "currency" to "USD",
                            "payerPersonId" to alice,
                            "occurredAtUtc" to "2026-03-01T12:00:00Z",
                            "participants" to listOf(
                                mapOf("personId" to alice, "splitMode" to "EVEN"),
                                mapOf("personId" to bob, "splitMode" to "EVEN")
                            )
                        )
                    )
                )
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.entry.participants.length()").value(2))
            .andExpect(jsonPath("$.entry.eventAmount").value(12.0))

        val snapshots = balanceSnapshotRepository.findAllByEventIdOrderByPersonIdAsc(UUID.fromString(eventId))
            .associate { it.personId.toString() to it.netAmount!!.toPlainString() }

        assertEquals("6.0000", snapshots[alice])
        assertEquals("-6.0000", snapshots[bob])
        assertEquals("0.0000", snapshots[carol])
    }

    @Test
    fun `income and update delete flows recompute balances and preserve semantics`() {
        val owner = registerAndVerify("owner-entry-income@splitbill.test")
        val token = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(token, "Entry Income")
        val alice = createPerson(token, eventId, "Alice")
        val bob = createPerson(token, eventId, "Bob")
        val carol = createPerson(token, eventId, "Carol")

        val created = mockMvc.perform(
            post("/events/$eventId/entries")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "type" to "INCOME",
                            "name" to "Refund",
                            "amount" to "9.0000",
                            "currency" to "USD",
                            "payerPersonId" to alice,
                            "occurredAtUtc" to "2026-03-01T12:00:00Z",
                            "participants" to listOf(
                                mapOf("personId" to bob, "splitMode" to "AMOUNT", "splitAmount" to "4.0000"),
                                mapOf("personId" to carol, "splitMode" to "AMOUNT", "splitAmount" to "5.0000")
                            )
                        )
                    )
                )
        )
            .andExpect(status().isCreated)
            .andReturn()
        val entryId = objectMapper.readTree(created.response.contentAsString).path("entry").path("id").asText()

        var snapshots = balanceSnapshotRepository.findAllByEventIdOrderByPersonIdAsc(UUID.fromString(eventId))
            .associate { it.personId.toString() to it.netAmount!!.toPlainString() }
        assertEquals("-9.0000", snapshots[alice])
        assertEquals("4.0000", snapshots[bob])
        assertEquals("5.0000", snapshots[carol])

        mockMvc.perform(
            patch("/events/$eventId/entries/$entryId")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "type" to "EXPENSE",
                            "name" to "Dinner corrected",
                            "amount" to "10.0000",
                            "participants" to listOf(
                                mapOf("personId" to bob, "splitMode" to "PERCENT", "splitPercent" to "100.00")
                            )
                        )
                    )
                )
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.entry.type").value("EXPENSE"))

        snapshots = balanceSnapshotRepository.findAllByEventIdOrderByPersonIdAsc(UUID.fromString(eventId))
            .associate { it.personId.toString() to it.netAmount!!.toPlainString() }
        assertEquals("10.0000", snapshots[alice])
        assertEquals("-10.0000", snapshots[bob])
        assertEquals("0.0000", snapshots[carol])

        mockMvc.perform(
            delete("/events/$eventId/entries/$entryId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isNoContent)

        snapshots = balanceSnapshotRepository.findAllByEventIdOrderByPersonIdAsc(UUID.fromString(eventId))
            .associate { it.personId.toString() to it.netAmount!!.toPlainString() }
        assertEquals("0.0000", snapshots[alice])
        assertEquals("0.0000", snapshots[bob])
        assertEquals("0.0000", snapshots[carol])
    }

    @Test
    fun `entry split validation and participant membership errors are explicit`() {
        val owner = registerAndVerify("owner-entry-invalid@splitbill.test")
        val token = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(token, "Entry Invalid")
        val alice = createPerson(token, eventId, "Alice")
        val bob = createPerson(token, eventId, "Bob")

        mockMvc.perform(
            post("/events/$eventId/entries")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "type" to "EXPENSE",
                            "name" to "Bad split",
                            "amount" to "10.0000",
                            "currency" to "USD",
                            "payerPersonId" to alice,
                            "occurredAtUtc" to "2026-03-01T12:00:00Z",
                            "participants" to listOf(
                                mapOf("personId" to alice, "splitMode" to "EVEN"),
                                mapOf("personId" to bob, "splitMode" to "PERCENT", "splitPercent" to "100.00")
                            )
                        )
                    )
                )
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("ENTRY_SPLIT_INVALID"))

        mockMvc.perform(
            post("/events/$eventId/entries")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "type" to "EXPENSE",
                            "name" to "External person",
                            "amount" to "10.0000",
                            "currency" to "USD",
                            "payerPersonId" to alice,
                            "occurredAtUtc" to "2026-03-01T12:00:00Z",
                            "participants" to listOf(
                                mapOf("personId" to UUID.randomUUID().toString(), "splitMode" to "EVEN")
                            )
                        )
                    )
                )
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("ENTRY_PARTICIPANT_NOT_IN_EVENT"))
    }

    private fun registerAndVerify(email: String): JsonNode {
        val register = mockMvc.perform(
            post("/auth/register")
                .contentType("application/json")
                .content(json(mapOf("email" to email, "password" to "StrongPass123!", "name" to "User")))
        )
            .andExpect(status().isCreated)
            .andReturn()

        val session = objectMapper.readTree(register.response.contentAsString)
        val accountId = session.path("account").path("id").asText()

        mockMvc.perform(
            post("/auth/verify-email")
                .contentType("application/json")
                .content(json(mapOf("token" to accountId)))
        )
            .andExpect(status().isOk)

        return session
    }

    private fun createEvent(token: String, name: String): String {
        val result = mockMvc.perform(
            post("/events")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(json(mapOf("name" to name, "baseCurrency" to "USD", "timezone" to "UTC")))
        )
            .andExpect(status().isCreated)
            .andReturn()

        return objectMapper.readTree(result.response.contentAsString).path("event").path("id").asText()
    }

    private fun createPerson(token: String, eventId: String, displayName: String): String {
        val result = mockMvc.perform(
            post("/events/$eventId/people")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(json(mapOf("displayName" to displayName)))
        )
            .andExpect(status().isCreated)
            .andReturn()

        return objectMapper.readTree(result.response.contentAsString).path("person").path("id").asText()
    }

    private fun json(payload: Any): String = objectMapper.writeValueAsString(payload)
}
