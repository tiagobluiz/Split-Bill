package com.splitbill.backend

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.splitbill.backend.auth.AccountEntity
import com.splitbill.backend.auth.AccountRepository
import com.splitbill.backend.events.EventCollaboratorEntity
import com.splitbill.backend.events.EventCollaboratorRepository
import com.splitbill.backend.events.EventEntity
import com.splitbill.backend.events.EventPersonEntity
import com.splitbill.backend.events.EventPersonRepository
import com.splitbill.backend.events.EventRepository
import com.splitbill.backend.events.InviteTokenEntity
import com.splitbill.backend.events.InviteTokenRepository
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.util.UUID

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@AutoConfigureMockMvc
class AuthAndVerificationIntegrationTests(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val accountRepository: AccountRepository,
    @Autowired private val eventRepository: EventRepository,
    @Autowired private val eventCollaboratorRepository: EventCollaboratorRepository,
    @Autowired private val eventPersonRepository: EventPersonRepository,
    @Autowired private val inviteTokenRepository: InviteTokenRepository
) {

    private val objectMapper = ObjectMapper().findAndRegisterModules()

    @BeforeEach
    fun setup() {
        eventCollaboratorRepository.deleteAllInBatch()
        eventPersonRepository.deleteAllInBatch()
        inviteTokenRepository.deleteAllInBatch()
        eventRepository.deleteAllInBatch()
        accountRepository.deleteAllInBatch()
    }

    @Test
    fun `register returns auth session for new account`() {
        val session = register(email = "new-user@splitbill.test")

        assertNotNull(session.path("tokens").path("accessToken").asText())
        assertFalse(session.path("account").path("emailVerified").asBoolean())
    }

    @Test
    fun `register rejects invalid email with validation error response`() {
        mockMvc.perform(
            post("/auth/register")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "email" to "invalid-email",
                            "password" to "StrongPass123!",
                            "name" to "Tester"
                        )
                    )
                )
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.errors[0].field").isNotEmpty)
    }

    @Test
    fun `login rejects invalid credentials`() {
        register(email = "login-user@splitbill.test", password = "StrongPass123!")

        mockMvc.perform(
            post("/auth/login")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "email" to "login-user@splitbill.test",
                            "password" to "WrongPassword"
                        )
                    )
                )
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("AUTH_INVALID_CREDENTIALS"))
    }

    @Test
    fun `refresh rejects unknown refresh token`() {
        mockMvc.perform(
            post("/auth/refresh")
                .contentType("application/json")
                .content(json(mapOf("refreshToken" to "unknown-refresh-token")))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("AUTH_REFRESH_INVALID"))
    }

    @Test
    fun `unverified account cannot create event`() {
        val session = register(email = "unverified-create@splitbill.test")
        val accessToken = session.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            post("/events")
                .header("Authorization", "Bearer $accessToken")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "name" to "Trip",
                            "baseCurrency" to "USD",
                            "timezone" to "UTC"
                        )
                    )
                )
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"))
    }

    @Test
    fun `verified account can create event`() {
        val session = register(email = "verified-create@splitbill.test")
        val accountId = session.path("account").path("id").asText()
        val accessToken = session.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            post("/auth/verify-email")
                .contentType("application/json")
                .content(json(mapOf("token" to accountId)))
        )
            .andExpect(status().isOk)

        mockMvc.perform(
            post("/events")
                .header("Authorization", "Bearer $accessToken")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "name" to "Verified Trip",
                            "baseCurrency" to "USD",
                            "timezone" to "UTC",
                            "defaultSettlementAlgorithm" to "MIN_TRANSFER"
                        )
                    )
                )
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.event.ownerAccountId").value(accountId))
    }

    @Test
    fun `unverified account cannot join invite`() {
        val ownerId = insertVerifiedAccount("invite-owner@splitbill.test")
        val eventId = insertEvent(ownerId)
        val personId = insertEventPerson(eventId, ownerId)
        val token = "invite-token-123456789012345"
        insertInvite(eventId, ownerId, token)

        val joinerSession = register(email = "unverified-joiner@splitbill.test")
        val accessToken = joinerSession.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            post("/invites/$token/join")
                .header("Authorization", "Bearer $accessToken")
                .contentType("application/json")
                .content(json(mapOf("personId" to personId.toString())))
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"))
    }

    @Test
    fun `verified account can join invite`() {
        val ownerId = insertVerifiedAccount("invite-owner-verified@splitbill.test")
        val eventId = insertEvent(ownerId)
        val personId = insertEventPerson(eventId, ownerId)
        val token = "invite-token-verified-123456"
        insertInvite(eventId, ownerId, token)

        val joinerSession = register(email = "verified-joiner@splitbill.test")
        val joinerId = joinerSession.path("account").path("id").asText()
        val accessToken = joinerSession.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            post("/auth/verify-email")
                .contentType("application/json")
                .content(json(mapOf("token" to joinerId)))
        )
            .andExpect(status().isOk)

        mockMvc.perform(
            post("/invites/$token/join")
                .header("Authorization", "Bearer $accessToken")
                .contentType("application/json")
                .content(json(mapOf("personId" to personId.toString())))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.eventId").value(eventId.toString()))
            .andExpect(jsonPath("$.personId").value(personId.toString()))
    }

    @Test
    fun `logout revokes access token`() {
        val session = register(email = "logout-user@splitbill.test")
        val accessToken = session.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            post("/auth/logout")
                .header("Authorization", "Bearer $accessToken")
        )
            .andExpect(status().isNoContent)

        mockMvc.perform(
            get("/me")
                .header("Authorization", "Bearer $accessToken")
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("AUTH_UNAUTHORIZED"))
    }

    @Test
    fun `preferences update returns updated profile`() {
        val session = register(email = "prefs-user@splitbill.test")
        val accessToken = session.path("tokens").path("accessToken").asText()

        mockMvc.perform(
            patch("/me/preferences")
                .header("Authorization", "Bearer $accessToken")
                .contentType("application/json")
                .content(json(mapOf("preferredCurrency" to "BRL")))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.account.preferredCurrency").value("BRL"))
    }

    private fun register(email: String, password: String = "StrongPass123!"): JsonNode {
        val result = mockMvc.perform(
            post("/auth/register")
                .contentType("application/json")
                .content(
                    json(
                        mapOf(
                            "email" to email,
                            "password" to password,
                            "name" to "Test User"
                        )
                    )
                )
        )
            .andExpect(status().isCreated)
            .andReturn()

        return objectMapper.readTree(result.response.contentAsString)
    }

    private fun insertVerifiedAccount(email: String): UUID {
        val account = accountRepository.save(
            AccountEntity(
                id = UUID.randomUUID(),
                email = email,
                passwordHash = "seeded-hash",
                name = "Seeded Account",
                preferredCurrency = "USD",
                emailVerifiedAt = Instant.now(),
                updatedAt = Instant.now()
            )
        )
        return requireNotNull(account.id)
    }

    private fun insertEvent(ownerId: UUID): UUID {
        val now = Instant.now()
        val event = eventRepository.save(
            EventEntity(
                id = UUID.randomUUID(),
                ownerAccountId = ownerId,
                name = "Seeded Event",
                baseCurrency = "USD",
                timezone = "UTC",
                defaultSettlementAlgorithm = "MIN_TRANSFER",
                createdAt = now,
                updatedAt = now
            )
        )

        eventCollaboratorRepository.save(
            EventCollaboratorEntity(
                id = UUID.randomUUID(),
                eventId = event.id,
                accountId = ownerId,
                role = "OWNER",
                joinedAt = now
            )
        )
        return requireNotNull(event.id)
    }

    private fun insertEventPerson(eventId: UUID, createdBy: UUID): UUID {
        val person = eventPersonRepository.save(
            EventPersonEntity(
                id = UUID.randomUUID(),
                eventId = eventId,
                displayName = "Seeded Person",
                createdByAccountId = createdBy
            )
        )
        return requireNotNull(person.id)
    }

    private fun insertInvite(eventId: UUID, createdBy: UUID, token: String) {
        inviteTokenRepository.save(
            InviteTokenEntity(
                id = UUID.randomUUID(),
                eventId = eventId,
                tokenHash = token,
                createdByAccountId = createdBy
            )
        )
    }

    private fun json(payload: Any): String = objectMapper.writeValueAsString(payload)
}
