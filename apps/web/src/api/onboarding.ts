import { useMutation } from '@tanstack/react-query'
import { SignupDiscriminator } from './onboarding-discriminators'
import type {
  SignupRequest,
  SignupAcceptedResponse,
  VerifyEmailRequest,
  VerifyEmailAcceptedResponse,
  ResendVerificationRequest,
  ResendVerificationAcceptedResponse,
} from './onboarding.types'

// Crockford base32 alphabet (ULID spec). Generates a 26-char ULID-shaped string
// using 128 bits of cryptographic random — suitable for X-Idempotency-Key header.
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
function generateUlid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let result = ''
  let bits = 0
  let accumulator = 0
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += CROCKFORD_CHARS[(accumulator >> bits) & 0x1f]
    }
  }
  if (bits > 0) result += CROCKFORD_CHARS[(accumulator << (5 - bits)) & 0x1f]
  return result
}

// ── Typed-error classes ───────────────────────────────────────────────────
// Per ADR 0093 Amendment J: discriminator is body.title, NOT body.error.
// H2 (admiral-ruling 2026-05-26T00:35Z): email_already_registered discriminator
// NOT emitted by server (always-202 posture); EmailAlreadyRegisteredError omitted.

export class ValidationFailedError extends Error {
  readonly cause = SignupDiscriminator.VALIDATION_FAILED
  constructor(detail?: string) {
    super(detail ?? 'Validation failed')
    this.name = 'ValidationFailedError'
  }
}

export class TenantSlugTakenError extends Error {
  readonly cause = SignupDiscriminator.TENANT_SLUG_TAKEN
  constructor() {
    super('That organization name is already taken')
    this.name = 'TenantSlugTakenError'
  }
}

export class TenantSlugReservedError extends Error {
  readonly cause = SignupDiscriminator.TENANT_SLUG_RESERVED
  constructor() {
    super('That organization name is reserved')
    this.name = 'TenantSlugReservedError'
  }
}

export class TenantSlugInvalidShapeError extends Error {
  readonly cause = SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE
  constructor() {
    super('Organization name must be 3–32 lowercase letters, numbers, or hyphens')
    this.name = 'TenantSlugInvalidShapeError'
  }
}

export class CaptchaFailedError extends Error {
  readonly cause = SignupDiscriminator.CAPTCHA_FAILED
  constructor() {
    super('Verification failed — please try again')
    this.name = 'CaptchaFailedError'
  }
}

export class RateLimitedError extends Error {
  readonly cause = SignupDiscriminator.RATE_LIMITED
  constructor(public readonly retryAfterSeconds: number) {
    super('Too many requests — please wait before trying again')
    this.name = 'RateLimitedError'
  }
}

export class VerificationTokenInvalidError extends Error {
  readonly cause = SignupDiscriminator.VERIFICATION_TOKEN_INVALID
  constructor() {
    super('This verification link is invalid')
    this.name = 'VerificationTokenInvalidError'
  }
}

export class VerificationTokenExpiredError extends Error {
  readonly cause = SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED
  constructor() {
    super('This verification link has expired')
    this.name = 'VerificationTokenExpiredError'
  }
}

// ── Signup ────────────────────────────────────────────────────────────────

export function useSignup() {
  return useMutation<SignupAcceptedResponse, Error, SignupRequest>({
    mutationFn: async (request) => {
      // X-Idempotency-Key header (ULID-shaped, ≤128 chars per spec §3.1 Amendment 5);
      // generated client-side to enable safe resubmit on network failure.
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': generateUlid(),
        },
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
          case SignupDiscriminator.VALIDATION_FAILED:         throw new ValidationFailedError(body.detail)
          case SignupDiscriminator.TENANT_SLUG_TAKEN:         throw new TenantSlugTakenError()
          case SignupDiscriminator.TENANT_SLUG_RESERVED:      throw new TenantSlugReservedError()
          case SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE: throw new TenantSlugInvalidShapeError()
          case SignupDiscriminator.CAPTCHA_FAILED:            throw new CaptchaFailedError()
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
          case SignupDiscriminator.VERIFICATION_TOKEN_INVALID: throw new VerificationTokenInvalidError()
          case SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED: throw new VerificationTokenExpiredError()
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
        const body = await response.json().catch(() => ({})) as { title?: string; detail?: string }
        switch (body.title) {
          case SignupDiscriminator.VALIDATION_FAILED: throw new ValidationFailedError(body.detail)
          case SignupDiscriminator.ORIGIN_INVALID:    throw new Error('origin_invalid')
          default: throw new Error(`resend failed: ${body.title ?? response.status}`)
        }
      }

      return response.json() as Promise<ResendVerificationAcceptedResponse>
    },
  })
}

// NOTE: useCheckAvailability REMOVED — endpoint removed per Admiral ruling D4 (W#79 §3.4)
