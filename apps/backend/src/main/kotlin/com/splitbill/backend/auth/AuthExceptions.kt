package com.splitbill.backend.auth

import com.splitbill.backend.api.ApiException
import org.springframework.http.HttpStatus

class AccountAlreadyExistsException : ApiException(
    status = HttpStatus.CONFLICT,
    code = "ACCOUNT_ALREADY_EXISTS",
    message = "An account with this email already exists"
)

class InvalidCredentialsException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "AUTH_INVALID_CREDENTIALS",
    message = "Email or password is invalid"
)

class UnauthorizedException(message: String = "Access token is invalid") : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "AUTH_UNAUTHORIZED",
    message = message
)

class RefreshTokenInvalidException : ApiException(
    status = HttpStatus.UNAUTHORIZED,
    code = "AUTH_REFRESH_INVALID",
    message = "Refresh token is invalid"
)

class VerificationTokenInvalidException : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "ACCOUNT_NOT_FOUND",
    message = "Verification token is invalid"
)

class EmailNotVerifiedException : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = "EMAIL_NOT_VERIFIED",
    message = "Email verification is required before this action"
)
