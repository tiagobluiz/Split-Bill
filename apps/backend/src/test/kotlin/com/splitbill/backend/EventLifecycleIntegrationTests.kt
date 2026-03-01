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
import com.splitbill.backend.events.InviteTokenEntity
import com.splitbill.backend.events.InviteTokenRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.security.MessageDigest
import java.util.UUID

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@AutoConfigureMockMvc
class EventLifecycleIntegrationTests(
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
    fun `owner can create list update and archive event`() {
        val owner = registerAndVerify("owner-lifecycle@splitbill.test")
        val ownerToken = owner.path("tokens").path("accessToken").asText()

        val created = mockMvc.perform(
            post("/events")
                .header("Authorization", "Bearer $ownerToken")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "name" to "Trip to Tokyo",
                            "baseCurrency" to "USD",
                            "timezone" to "Asia/Tokyo"
                        )
                    )
                )
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.event.name").value("Trip to Tokyo"))
            .andReturn()

        val eventId = objectMapper.readTree(created.response.contentAsString).path("event").path("id").asText()

        mockMvc.perform(
            get("/events")
                .header("Authorization", "Bearer $ownerToken")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalItems").value(1))
            .andExpect(jsonPath("$.items[0].id").value(eventId))

        mockMvc.perform(
            patch("/events/$eventId")
                .header("Authorization", "Bearer $ownerToken")
                .contentType("application/json")
                .content(json(mapOf("name" to "Trip to Kyoto")))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.event.name").value("Trip to Kyoto"))

        mockMvc.perform(
            delete("/events/$eventId")
                .header("Authorization", "Bearer $ownerToken")
        )
            .andExpect(status().isNoContent)

        mockMvc.perform(
            get("/events")
                .header("Authorization", "Bearer $ownerToken")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalItems").value(0))
    }

    @Test
    fun `owner can create and update event people`() {
        val owner = registerAndVerify("owner-people@splitbill.test")
        val ownerToken = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(ownerToken, "People Event")

        val createdPerson = mockMvc.perform(
            post("/events/$eventId/people")
                .header("Authorization", "Bearer $ownerToken")
                .contentType("application/json")
                .content(json(mapOf("displayName" to "Alice")))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.person.displayName").value("Alice"))
            .andReturn()

        val personId = objectMapper.readTree(createdPerson.response.contentAsString).path("person").path("id").asText()

        mockMvc.perform(
            patch("/events/$eventId/people/$personId")
                .header("Authorization", "Bearer $ownerToken")
                .contentType("application/json")
                .content(json(mapOf("displayName" to "Alice Cooper")))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.person.displayName").value("Alice Cooper"))

        mockMvc.perform(
            get("/events/$eventId")
                .header("Authorization", "Bearer $ownerToken")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.people[0].displayName").value("Alice Cooper"))
    }

    @Test
    fun `collaborator membership is queryable in event details`() {
        val owner = registerAndVerify("owner-collab-query@splitbill.test")
        val ownerToken = owner.path("tokens").path("accessToken").asText()
        val eventId = createEvent(ownerToken, "Collab Event")
        val personId = createPerson(ownerToken, eventId, "Bob")

        val joiner = registerAndVerify("joiner-collab-query@splitbill.test")
        val joinerToken = joiner.path("tokens").path("accessToken").asText()
        val inviteToken = "inv-" + UUID.randomUUID().toString().replace("-", "")
        seedInvite(eventId, owner.path("account").path("id").asText(), inviteToken)

        mockMvc.perform(
            post("/invites/$inviteToken/join")
                .header("Authorization", "Bearer $joinerToken")
                .contentType("application/json")
                .content(json(mapOf("personId" to personId)))
        )
            .andExpect(status().isOk)

        mockMvc.perform(
            get("/events/$eventId")
                .header("Authorization", "Bearer $ownerToken")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.collaborators.length()").value(2))
    }

    @Test
    fun `non collaborator cannot access event details`() {
        val owner = registerAndVerify("owner-deny@splitbill.test")
        val ownerToken = owner.path("tokens").path("accessToken").asText()
        val stranger = registerAndVerify("stranger-deny@splitbill.test")
        val strangerToken = stranger.path("tokens").path("accessToken").asText()

        val eventId = createEvent(ownerToken, "Restricted Event")

        mockMvc.perform(
            get("/events/$eventId")
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

    private fun seedInvite(eventId: String, ownerAccountId: String, token: String) {
        inviteTokenRepository.save(
            InviteTokenEntity(
                id = UUID.randomUUID(),
                eventId = UUID.fromString(eventId),
                tokenHash = hashInviteToken(token),
                createdByAccountId = UUID.fromString(ownerAccountId)
            )
        )
    }

    private fun hashInviteToken(rawToken: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(rawToken.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun json(payload: Any): String = objectMapper.writeValueAsString(payload)
}
