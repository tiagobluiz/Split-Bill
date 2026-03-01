package com.splitbill.backend.auth

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.util.UUID

data class RegisterRequest(
    @field:NotBlank
    @field:Email
    val email: String,
    @field:NotBlank
    @field:Size(min = 8)
    val password: String,
    @field:NotBlank
    @field:Size(min = 1, max = 120)
    val name: String
)

data class VerifyEmailRequest(
    @field:NotBlank
    val token: String
)

data class LoginRequest(
    @field:NotBlank
    @field:Email
    val email: String,
    @field:NotBlank
    val password: String
)

data class RefreshRequest(
    @field:NotBlank
    val refreshToken: String
)

data class AccountProfile(
    val id: UUID,
    val email: String,
    val name: String,
    val preferredCurrency: String,
    val emailVerified: Boolean
)

data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresInSeconds: Long
)

data class AuthSessionResponse(
    val account: AccountProfile,
    val tokens: AuthTokens
)

data class MessageResponse(
    val message: String
)

data class UpdatePreferencesRequest(
    @field:Pattern(regexp = "^[A-Z]{3}$")
    val preferredCurrency: String? = null,
    @field:Size(max = 64)
    val timezone: String? = null
)

data class AccountProfileResponse(
    val account: AccountProfile
)
