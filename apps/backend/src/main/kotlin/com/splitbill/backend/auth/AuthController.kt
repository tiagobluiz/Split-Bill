package com.splitbill.backend.auth

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody request: RegisterRequest): AuthSessionResponse {
        return authService.register(request)
    }

    @PostMapping("/auth/verify-email")
    fun verifyEmail(@Valid @RequestBody request: VerifyEmailRequest): MessageResponse {
        return authService.verifyEmail(request)
    }

    @PostMapping("/auth/login")
    fun login(@Valid @RequestBody request: LoginRequest): AuthSessionResponse {
        return authService.login(request)
    }

    @PostMapping("/auth/refresh")
    fun refresh(@Valid @RequestBody request: RefreshRequest): AuthSessionResponse {
        return authService.refresh(request)
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(@RequestHeader(name = "Authorization", required = false) authorizationHeader: String?) {
        authService.logout(authorizationHeader)
    }

    @GetMapping("/me")
    fun me(@RequestHeader(name = "Authorization", required = false) authorizationHeader: String?): AccountProfileResponse {
        return authService.currentProfile(authorizationHeader)
    }

    @PatchMapping("/me/preferences")
    fun updatePreferences(
        @RequestHeader(name = "Authorization", required = false) authorizationHeader: String?,
        @Valid @RequestBody request: UpdatePreferencesRequest
    ): AccountProfileResponse {
        return authService.updatePreferences(authorizationHeader, request)
    }
}
