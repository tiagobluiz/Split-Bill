package com.splitbill.backend.auth

import com.splitbill.backend.api.ApiException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
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

    fun register(request: RegisterRequest): AuthSessionResponse {
        val email = requireNotNull(request.email)
        val password = requireNotNull(request.password)
        val name = requireNotNull(request.name)

        if (accountRepository.findByEmail(email) != null) {
            throw ApiException(
                status = HttpStatus.CONFLICT,
                code = "ACCOUNT_ALREADY_EXISTS",
                message = "An account with this email already exists"
            )
        }

        val account = try {
            val encodedPassword = requireNotNull(passwordEncoder.encode(password)) {
                "Password encoding failed"
            }
            accountRepository.createAccount(
                email = email,
                passwordHash = encodedPassword,
                name = name,
                preferredCurrency = "USD"
            )
        } catch (ex: DataIntegrityViolationException) {
            throw ApiException(
                status = HttpStatus.CONFLICT,
                code = "ACCOUNT_ALREADY_EXISTS",
                message = "An account with this email already exists"
            )
        }

        return buildSessionResponse(account)
    }

    fun verifyEmail(request: VerifyEmailRequest): MessageResponse {
        val accountId = request.token.toUuidOrNull() ?: throw ApiException(
            status = HttpStatus.NOT_FOUND,
            code = "ACCOUNT_NOT_FOUND",
            message = "Verification token is invalid"
        )

        val updated = accountRepository.verifyEmail(accountId)
        if (!updated) {
            throw ApiException(
                status = HttpStatus.NOT_FOUND,
                code = "ACCOUNT_NOT_FOUND",
                message = "Verification token is invalid"
            )
        }

        return MessageResponse(message = "Email verified")
    }

    fun login(request: LoginRequest): AuthSessionResponse {
        val email = requireNotNull(request.email)
        val password = requireNotNull(request.password)

        val account = accountRepository.findByEmail(email)
            ?: throw invalidCredentials()

        if (!passwordEncoder.matches(password, account.passwordHash)) {
            throw invalidCredentials()
        }

        return buildSessionResponse(account)
    }

    fun refresh(request: RefreshRequest): AuthSessionResponse {
        val session = tokenStore.refresh(request.refreshToken)
            ?: throw ApiException(
                status = HttpStatus.UNAUTHORIZED,
                code = "AUTH_REFRESH_INVALID",
                message = "Refresh token is invalid"
            )

        val account = accountRepository.findById(session.accountId)
            ?: throw ApiException(
                status = HttpStatus.UNAUTHORIZED,
                code = "AUTH_UNAUTHORIZED",
                message = "Account session is no longer valid"
            )

        return AuthSessionResponse(
            account = account.toProfile(),
            tokens = session.toTokens(tokenStore.accessTokenTtlSeconds())
        )
    }

    fun logout(authorizationHeader: String?) {
        val account = requireAuthenticated(authorizationHeader)
        val token = extractBearerToken(authorizationHeader)
        tokenStore.revokeByAccess(token)
        account
    }

    fun requireAuthenticated(authorizationHeader: String?): AuthenticatedAccount {
        val token = extractBearerToken(authorizationHeader)
        val session = tokenStore.resolveAccess(token)
            ?: throw ApiException(
                status = HttpStatus.UNAUTHORIZED,
                code = "AUTH_UNAUTHORIZED",
                message = "Access token is invalid"
            )

        val account = accountRepository.findById(session.accountId)
            ?: throw ApiException(
                status = HttpStatus.UNAUTHORIZED,
                code = "AUTH_UNAUTHORIZED",
                message = "Access token is invalid"
            )

        return AuthenticatedAccount(account.id, account.emailVerified)
    }

    fun requireVerified(account: AuthenticatedAccount) {
        if (!account.emailVerified) {
            throw ApiException(
                status = HttpStatus.FORBIDDEN,
                code = "EMAIL_NOT_VERIFIED",
                message = "Email verification is required before this action"
            )
        }
    }

    fun currentProfile(authorizationHeader: String?): AccountProfileResponse {
        val account = requireAuthenticated(authorizationHeader)
        val record = accountRepository.findById(account.id)
            ?: throw ApiException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Access token is invalid")
        return AccountProfileResponse(account = record.toProfile())
    }

    fun updatePreferences(authorizationHeader: String?, request: UpdatePreferencesRequest): AccountProfileResponse {
        val account = requireAuthenticated(authorizationHeader)
        accountRepository.updatePreferences(account.id, request.preferredCurrency, request.timezone)
        val updated = accountRepository.findById(account.id)
            ?: throw ApiException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Access token is invalid")
        return AccountProfileResponse(account = updated.toProfile())
    }

    private fun buildSessionResponse(account: AccountRecord): AuthSessionResponse {
        val session = tokenStore.issue(account.id)
        return AuthSessionResponse(
            account = account.toProfile(),
            tokens = session.toTokens(tokenStore.accessTokenTtlSeconds())
        )
    }

    private fun extractBearerToken(authorizationHeader: String?): String {
        val raw = authorizationHeader?.trim().orEmpty()
        if (!raw.startsWith("Bearer ", ignoreCase = true)) {
            throw ApiException(
                status = HttpStatus.UNAUTHORIZED,
                code = "AUTH_UNAUTHORIZED",
                message = "Authorization header is required"
            )
        }
        val token = raw.substringAfter(' ').trim()
        if (token.isBlank()) {
            throw ApiException(
                status = HttpStatus.UNAUTHORIZED,
                code = "AUTH_UNAUTHORIZED",
                message = "Authorization header is required"
            )
        }
        return token
    }

    private fun invalidCredentials(): ApiException {
        return ApiException(
            status = HttpStatus.UNAUTHORIZED,
            code = "AUTH_INVALID_CREDENTIALS",
            message = "Email or password is invalid"
        )
    }

    private fun String.toUuidOrNull(): UUID? = try {
        UUID.fromString(this)
    } catch (_: IllegalArgumentException) {
        null
    }

    private fun AccountRecord.toProfile(): AccountProfile {
        return AccountProfile(
            id = id,
            email = email,
            name = name,
            preferredCurrency = preferredCurrency,
            emailVerified = emailVerified
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
