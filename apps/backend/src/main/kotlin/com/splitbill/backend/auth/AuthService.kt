package com.splitbill.backend.auth

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class AuthenticatedAccount(
    val id: UUID,
    val emailVerified: Boolean
)

@Service
class AuthService(
    private val accountRepository: AccountRepository,
    private val tokenStore: AuthTokenStore,
    private val passwordEncoder: PasswordEncoder
) {

    /** Registers a new account and returns an authenticated session payload. */
    @Transactional
    fun register(request: RegisterRequest): AuthSessionResponse {
        val email = requireNotNull(request.email)
        val password = requireNotNull(request.password)
        val name = requireNotNull(request.name)

        if (accountRepository.findByEmailIgnoreCase(email) != null) {
            throw AccountAlreadyExistsException()
        }

        val account = try {
            accountRepository.save(
                AccountEntity(
                    id = UUID.randomUUID(),
                    email = email,
                    passwordHash = requireNotNull(passwordEncoder.encode(password)) { "Password encoding failed" },
                    name = name,
                    preferredCurrency = "USD",
                    emailVerifiedAt = null,
                    updatedAt = Instant.now()
                )
            )
        } catch (_: DataIntegrityViolationException) {
            throw AccountAlreadyExistsException()
        }

        return buildSessionResponse(account)
    }

    /** Verifies an account e-mail from a verification token payload. */
    @Transactional
    fun verifyEmail(request: VerifyEmailRequest): MessageResponse {
        val accountId = request.token.toUuidOrNull() ?: throw VerificationTokenInvalidException()

        val account = accountRepository.findById(accountId).orElseThrow { VerificationTokenInvalidException() }
        if (account.emailVerifiedAt == null) {
            account.emailVerifiedAt = Instant.now()
            account.updatedAt = Instant.now()
            accountRepository.save(account)
        }

        return MessageResponse(message = "Email verified")
    }

    /** Authenticates credentials and returns a fresh session payload. */
    fun login(request: LoginRequest): AuthSessionResponse {
        val email = requireNotNull(request.email)
        val password = requireNotNull(request.password)

        val account = accountRepository.findByEmailIgnoreCase(email) ?: throw InvalidCredentialsException()
        if (!passwordEncoder.matches(password, account.passwordHash)) {
            throw InvalidCredentialsException()
        }

        return buildSessionResponse(account)
    }

    /** Issues a new access/refresh token pair from a refresh token. */
    fun refresh(request: RefreshRequest): AuthSessionResponse {
        val session = tokenStore.refresh(requireNotNull(request.refreshToken)) ?: throw RefreshTokenInvalidException()
        val account = accountRepository.findById(session.accountId).orElseThrow { UnauthorizedException() }

        return AuthSessionResponse(
            account = account.toProfile(),
            tokens = session.toTokens(tokenStore.accessTokenTtlSeconds())
        )
    }

    /** Revokes the current access token session. */
    fun logout(authorizationHeader: String?) {
        val token = extractBearerToken(authorizationHeader)
        requireAuthenticated(authorizationHeader)
        tokenStore.revokeByAccess(token)
    }

    /** Resolves the authenticated account from the Bearer token header. */
    fun requireAuthenticated(authorizationHeader: String?): AuthenticatedAccount {
        val token = extractBearerToken(authorizationHeader)
        val session = tokenStore.resolveAccess(token) ?: throw UnauthorizedException()
        val account = accountRepository.findById(session.accountId).orElseThrow { UnauthorizedException() }
        return AuthenticatedAccount(requireNotNull(account.id), account.emailVerifiedAt != null)
    }

    /** Enforces verified-account access for protected business actions. */
    fun requireVerified(account: AuthenticatedAccount) {
        if (!account.emailVerified) {
            throw EmailNotVerifiedException()
        }
    }

    /** Returns the current authenticated account profile payload. */
    fun currentProfile(authorizationHeader: String?): AccountProfileResponse {
        val account = requireAuthenticated(authorizationHeader)
        val entity = accountRepository.findById(account.id).orElseThrow { UnauthorizedException() }
        return AccountProfileResponse(account = entity.toProfile())
    }

    /** Applies supported preference fields and returns the updated profile payload. */
    @Transactional
    fun updatePreferences(authorizationHeader: String?, request: UpdatePreferencesRequest): AccountProfileResponse {
        val account = requireAuthenticated(authorizationHeader)
        val entity = accountRepository.findById(account.id).orElseThrow { UnauthorizedException() }

        request.preferredCurrency?.let { entity.preferredCurrency = it }
        entity.updatedAt = Instant.now()

        val updated = accountRepository.save(entity)
        return AccountProfileResponse(account = updated.toProfile())
    }

    private fun buildSessionResponse(account: AccountEntity): AuthSessionResponse {
        val accountId = requireNotNull(account.id)
        val session = tokenStore.issue(accountId)
        return AuthSessionResponse(
            account = account.toProfile(),
            tokens = session.toTokens(tokenStore.accessTokenTtlSeconds())
        )
    }

    private fun extractBearerToken(authorizationHeader: String?): String {
        val raw = authorizationHeader?.trim().orEmpty()
        if (!raw.startsWith("Bearer ", ignoreCase = true)) {
            throw UnauthorizedException("Authorization header is required")
        }
        val token = raw.substringAfter(' ').trim()
        if (token.isBlank()) {
            throw UnauthorizedException("Authorization header is required")
        }
        return token
    }

    private fun String.toUuidOrNull(): UUID? = try {
        UUID.fromString(this)
    } catch (_: IllegalArgumentException) {
        null
    }

    private fun AccountEntity.toProfile(): AccountProfile {
        return AccountProfile(
            id = requireNotNull(id),
            email = requireNotNull(email),
            name = requireNotNull(name),
            preferredCurrency = requireNotNull(preferredCurrency),
            emailVerified = emailVerifiedAt != null
        )
    }

    private fun TokenSession.toTokens(expiresInSeconds: Long): AuthTokens {
        return AuthTokens(
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresInSeconds = expiresInSeconds
        )
    }
}
