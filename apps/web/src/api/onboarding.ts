import { useMutation } from '@tanstack/react-query'
import type {
  SignupRequest,
  SignupAcceptedResponse,
  VerifyEmailRequest,
  VerifyEmailAcceptedResponse,
  ResendVerificationRequest,
  ResendVerificationAcceptedResponse,
  CheckAvailabilityRequest,
  CheckAvailabilityResponse,
} from './onboarding.types'

// ── Typed-error classes ───────────────────────────────────────────────────
// Per ADR 0093 Amendment J: discriminator is body.title, NOT body.error.
// H2 (admiral-ruling 2026-05-26T00:35Z): email_already_registered discriminator
// NOT emitted by server (always-202 posture); EmailAlreadyRegisteredError omitted.

export class ValidationFailedError extends Error {
  readonly cause = 'validation_failed' as const
  constructor(detail?: string) {
    super(detail ?? 'Validation failed')
    this.name = 'ValidationFailedError'
  }
}

export class TenantSlugTakenError extends Error {
  readonly cause = 'tenant_slug_taken' as const
  constructor() {
    super('That organization name is already taken')
    this.name = 'TenantSlugTakenError'
  }
}

export class TenantSlugReservedError extends Error {
  readonly cause = 'tenant_slug_reserved' as const
  constructor() {
    super('That organization name is reserved')
    this.name = 'TenantSlugReservedError'
  }
}

export class TenantSlugInvalidShapeError extends Error {
  readonly cause = 'tenant_slug_invalid_shape' as const
  constructor() {
    super('Organization name must be 3–32 lowercase letters, numbers, or hyphens')
    this.name = 'TenantSlugInvalidShapeError'
  }
}

export class CaptchaFailedError extends Error {
  readonly cause = 'captcha_failed' as const
  constructor() {
    super('Verification failed — please try again')
    this.name = 'CaptchaFailedError'
  }
}

export class RateLimitedError extends Error {
  readonly cause = 'rate_limited' as const
  constructor(public readonly retryAfterSeconds: number) {
    super('Too many requests — please wait before trying again')
    this.name = 'RateLimitedError'
  }
}

export class VerificationTokenInvalidError extends Error {
  readonly cause = 'verification_token_invalid' as const
  constructor() {
    super('This verification link is invalid')
    this.name = 'VerificationTokenInvalidError'
  }
}

export class VerificationTokenExpiredError extends Error {
  readonly cause = 'verification_token_expired' as const
  constructor() {
    super('This verification link has expired')
    this.name = 'VerificationTokenExpiredError'
  }
}

// ── Signup ────────────────────────────────────────────────────────────────

export function useSignup() {
  return useMutation<SignupAcceptedResponse, Error, SignupRequest>({
    mutationFn: async (request) => {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10)
        throw new RateLimitedError(retryAfter)
      }

      if (response.status === 403) {
        throw new Error('origin_invalid')
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { title?: string; detail?: string }
        switch (body.title) {
          case 'validation_failed':           throw new ValidationFailedError(body.detail)
          case 'tenant_slug_taken':           throw new TenantSlugTakenError()
          case 'tenant_slug_reserved':        throw new TenantSlugReservedError()
          case 'tenant_slug_invalid_shape':   throw new TenantSlugInvalidShapeError()
          case 'captcha_failed':              throw new CaptchaFailedError()
          default: throw new Error(`signup failed: ${body.title ?? response.status}`)
        }
      }

      return response.json() as Promise<SignupAcceptedResponse>
    },
  })
}

// ── Verify email ──────────────────────────────────────────────────────────

export function useVerifyEmail() {
  return useMutation<VerifyEmailAcceptedResponse, Error, VerifyEmailRequest>({
    mutationFn: async (request) => {
      const response = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10)
        throw new RateLimitedError(retryAfter)
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { title?: string; detail?: string }
        switch (body.title) {
          case 'verification_token_invalid': throw new VerificationTokenInvalidError()
          case 'verification_token_expired': throw new VerificationTokenExpiredError()
          default: throw new Error(`verify-email failed: ${body.title ?? response.status}`)
        }
      }

      return response.json() as Promise<VerifyEmailAcceptedResponse>
    },
  })
}

// ── Resend verification ───────────────────────────────────────────────────

export function useResendVerification() {
  return useMutation<ResendVerificationAcceptedResponse, Error, ResendVerificationRequest>({
    mutationFn: async (request) => {
      const response = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10)
        throw new RateLimitedError(retryAfter)
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { title?: string }
        throw new Error(`resend failed: ${body.title ?? response.status}`)
      }

      return response.json() as Promise<ResendVerificationAcceptedResponse>
    },
  })
}

// ── Check availability ────────────────────────────────────────────────────

export function useCheckAvailability() {
  return useMutation<CheckAvailabilityResponse, Error, CheckAvailabilityRequest>({
    mutationFn: async (request) => {
      const response = await fetch('/api/v1/auth/check-availability', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`check-availability failed: ${response.status}`)
      }

      return response.json() as Promise<CheckAvailabilityResponse>
    },
  })
}
