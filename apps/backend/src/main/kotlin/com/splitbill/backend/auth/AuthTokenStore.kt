package com.splitbill.backend.auth

import org.springframework.stereotype.Component
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class TokenSession(
    val accountId: UUID,
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Instant
)

@Component
class AuthTokenStore {
    companion object {
        private const val ACCESS_TOKEN_TTL_SECONDS = 3600L
    }

    private val accessIndex = ConcurrentHashMap<String, TokenSession>()
    private val refreshIndex = ConcurrentHashMap<String, TokenSession>()

    fun issue(accountId: UUID): TokenSession {
        val access = "sb_at_${UUID.randomUUID()}"
        val refresh = "sb_rt_${UUID.randomUUID()}"
        val session = TokenSession(
            accountId = accountId,
            accessToken = access,
            refreshToken = refresh,
            expiresAt = Instant.now().plusSeconds(ACCESS_TOKEN_TTL_SECONDS)
        )

        accessIndex[access] = session
        refreshIndex[refresh] = session

        return session
    }

    fun refresh(refreshToken: String): TokenSession? {
        val existing = refreshIndex[refreshToken] ?: return null
        if (!existing.expiresAt.isAfter(Instant.now())) {
            refreshIndex.remove(refreshToken)
            accessIndex.remove(existing.accessToken)
            return null
        }

        refreshIndex.remove(refreshToken)
        accessIndex.remove(existing.accessToken)
        return issue(existing.accountId)
    }

    fun resolveAccess(accessToken: String): TokenSession? {
        val session = accessIndex[accessToken] ?: return null
        if (session.expiresAt.isBefore(Instant.now())) {
            revokeByAccess(accessToken)
            return null
        }
        return session
    }

    fun revokeByAccess(accessToken: String) {
        val session = accessIndex.remove(accessToken) ?: return
        refreshIndex.remove(session.refreshToken)
    }

    fun accessTokenTtlSeconds(): Long = ACCESS_TOKEN_TTL_SECONDS
}
