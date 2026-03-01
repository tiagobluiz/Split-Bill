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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@AutoConfigureMockMvc
class EventBalancesIntegrationTests(
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
    fun `balances endpoint uses default algorithm and supports override`() {
        val owner = registerAndVerify("owner-balances@splitbill.test")
        val token = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(token, "Balances Event", "PAIRWISE")
        val alice = createPerson(token, eventId, "Alice")
        val bob = createPerson(token, eventId, "Bob")
        val carol = createPerson(token, eventId, "Carol")

        createExpenseEntry(token, eventId, alice, bob, carol)

        val defaultBalances = readJson(
            mockMvc.perform(
                get("/events/$eventId/balances")
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.algorithm").value("PAIRWISE"))
                .andReturn()
        )

        assertEquals("USD", defaultBalances.path("currency").asText())
        assertEquals("PAIRWISE", defaultBalances.path("algorithm").asText())
        val defaultByPerson = balanceByPerson(defaultBalances)
        assertEquals(6.0, requireNotNull(defaultByPerson[alice]).path("netAmountInEventCurrency").asDouble(), 0.0001)
        assertEquals(-3.0, requireNotNull(defaultByPerson[bob]).path("netAmountInEventCurrency").asDouble(), 0.0001)
        assertEquals(-3.0, requireNotNull(defaultByPerson[carol]).path("netAmountInEventCurrency").asDouble(), 0.0001)

        val overrideBalances = readJson(
            mockMvc.perform(
                get("/events/$eventId/balances")
                    .param("algorithm", "MIN_TRANSFER")
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.algorithm").value("MIN_TRANSFER"))
                .andReturn()
        )

        assertEquals("MIN_TRANSFER", overrideBalances.path("algorithm").asText())
        val overrideByPerson = balanceByPerson(overrideBalances)
        assertEquals(6.0, requireNotNull(overrideByPerson[alice]).path("netAmountInEventCurrency").asDouble(), 0.0001)
    }

    @Test
    fun `non collaborator cannot access balances`() {
        val owner = registerAndVerify("owner-balances-deny@splitbill.test")
        val ownerToken = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(ownerToken, "Restricted Balances", null)
        val stranger = registerAndVerify("stranger-balances-deny@splitbill.test")
        val strangerToken = stranger.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            get("/events/$eventId/balances")
                .header("Authorization", "Bearer $strangerToken")
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("EVENT_ACCESS_DENIED"))
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

    private fun createEvent(token: String, name: String, defaultAlgorithm: String?): String {
        val payload = mutableMapOf(
            "name" to name,
            "baseCurrency" to "USD",
            "timezone" to "UTC"
        )
        if (defaultAlgorithm != null) {
            payload["defaultSettlementAlgorithm"] = defaultAlgorithm
        }

        val result = mockMvc.perform(
            post("/events")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(json(payload))
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

    private fun createExpenseEntry(token: String, eventId: String, payer: String, participantA: String, participantB: String) {
        mockMvc.perform(
            post("/events/$eventId/entries")
                .header("Authorization", "Bearer $token")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "type" to "EXPENSE",
                            "name" to "Dinner",
                            "amount" to "9.0000",
                            "currency" to "USD",
                            "payerPersonId" to payer,
                            "occurredAtUtc" to "2026-03-01T12:00:00Z",
                            "participants" to listOf(
                                mapOf("personId" to payer, "splitMode" to "EVEN"),
                                mapOf("personId" to participantA, "splitMode" to "EVEN"),
                                mapOf("personId" to participantB, "splitMode" to "EVEN")
                            )
                        )
                    )
                )
        )
            .andExpect(status().isCreated)
    }

    private fun readJson(result: org.springframework.test.web.servlet.MvcResult): JsonNode =
        objectMapper.readTree(result.response.contentAsString)

    private fun balanceByPerson(response: JsonNode): Map<String, JsonNode> =
        response.path("balances").associateBy { it.path("personId").asText() }

    private fun json(payload: Any): String = objectMapper.writeValueAsString(payload)
}
