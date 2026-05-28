// W#79 onboarding contract tests.
// Runs against MSW handlers — verifies typed-error class roster + discriminator single-source-of-truth.
// Per spec §4.4 + test-eng T2.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../../../msw/server'
import { resetSignupCallCount } from '../../../msw/onboarding-handlers'
import { SignupDiscriminator } from '../onboarding-discriminators'

// ── Discriminator single-source-of-truth contract ─────────────────────────

describe('SignupDiscriminator const-export — single source of truth', () => {
  it('exports exactly 9 discriminator constants matching spec §3.5', () => {
    const values = Object.values(SignupDiscriminator)
    expect(values).toHaveLength(9)
    expect(values).toContain('validation_failed')
    expect(values).toContain('tenant_slug_taken')
    expect(values).toContain('tenant_slug_reserved')
    expect(values).toContain('tenant_slug_invalid_shape')
    expect(values).toContain('verification_token_invalid')
    expect(values).toContain('verification_token_expired')
    expect(values).toContain('captcha_failed')
    expect(values).toContain('rate_limited')
    expect(values).toContain('origin_invalid')
  })

  it('does NOT include retired email_already_registered discriminator (H2 RATIFY)', () => {
    const values = Object.values(SignupDiscriminator)
    expect(values).not.toContain('email_already_registered')
  })

  it('does NOT include retired verification_token_already_used discriminator (H9 idempotent)', () => {
    const values = Object.values(SignupDiscriminator)
    expect(values).not.toContain('verification_token_already_used')
  })
})

// ── MSW handler contract tests ────────────────────────────────────────────

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetSignupCallCount()  // Reset module-level rate-limit counter between tests
})
afterAll(() => server.close())

describe('MSW onboarding handlers — contract conformance', () => {
  describe('POST /api/v1/auth/signup', () => {
    it('returns 202 with email_dispatch_id + correlation_id for valid request (happy path)', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secure-pass-12345',
          tenant_slug: 'acme-test',
          tenant_display_name: 'Acme Test',
          captcha_token: 'mock-pass',
        }),
      })
      expect(res.status).toBe(202)
      const body = await res.json()
      // §3.1 POSITIVE-MATCH: both fields required on 202 response.
      expect(body).toHaveProperty('email_dispatch_id')
      expect(body).toHaveProperty('correlation_id')
      // Amendment I: must NOT expose tenant_id / verification_token / password_hash
      expect(body).not.toHaveProperty('tenant_id')
      expect(body).not.toHaveProperty('verification_token')
      expect(body).not.toHaveProperty('password_hash')
    })

    it('returns 400 title=validation_failed for missing required fields', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.VALIDATION_FAILED)
      expect(body).not.toHaveProperty('error')
    })

    it('returns 400 title=tenant_slug_taken for known-taken slug', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secure-pass-12345',
          tenant_slug: 'taken-slug',
          tenant_display_name: 'Test',
          captcha_token: 'mock-pass',
        }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.TENANT_SLUG_TAKEN)
      expect(body).not.toHaveProperty('error')
    })

    it('returns 400 title=tenant_slug_reserved for reserved slug', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secure-pass-12345',
          tenant_slug: 'admin',
          tenant_display_name: 'Test',
          captcha_token: 'mock-pass',
        }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.TENANT_SLUG_RESERVED)
    })

    it('returns 400 title=tenant_slug_invalid_shape for invalid slug pattern', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secure-pass-12345',
          tenant_slug: 'UPPERCASE',
          tenant_display_name: 'Test',
          captcha_token: 'mock-pass',
        }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE)
    })

    it('returns 400 title=captcha_failed for failed captcha', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secure-pass-12345',
          tenant_slug: 'acme-test',
          tenant_display_name: 'Test',
          captcha_token: 'captcha-fail',
        }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.CAPTCHA_FAILED)
    })

    it('returns 403 title=origin_invalid when Origin header missing', async () => {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secure-pass-12345',
          tenant_slug: 'acme-test',
          tenant_display_name: 'Test',
          captcha_token: 'mock-pass',
        }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.ORIGIN_INVALID)
    })
  })

  describe('POST /api/v1/auth/verify-email', () => {
    it('returns 200 with email + tenant_slug + tenant_display_name for valid token', async () => {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ verification_token: 'valid-mock-token' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      // §3.2 POSITIVE-MATCH: all three user-facing identifiers required on 200 response.
      expect(body).toHaveProperty('email')
      expect(body).toHaveProperty('tenant_slug')
      expect(body).toHaveProperty('tenant_display_name')
      // Amendment I negative-match: must NOT expose tenant_id or session_token
      expect(body).not.toHaveProperty('tenant_id')
      expect(body).not.toHaveProperty('session_token')
      expect(body).not.toHaveProperty('auth_token')
    })

    it('returns 400 title=verification_token_invalid for invalid token', async () => {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ verification_token: 'invalid-token' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.VERIFICATION_TOKEN_INVALID)
      expect(body).not.toHaveProperty('error')
    })

    it('returns 400 title=verification_token_expired for expired token', async () => {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ verification_token: 'expired-token' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.title).toBe(SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED)
    })

    it('returns 200 for already-consumed token (H9 idempotent)', async () => {
      // Per H9 RATIFY: already-consumed token → 200, same shape. No verification_token_already_used.
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ verification_token: 'already-consumed-token' }),
      })
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/v1/auth/resend-verification', () => {
    it('returns 202 with status=queued regardless of email existence (uniform-202)', async () => {
      for (const email of ['unknown@example.com', 'known@example.com', 'verified@example.com']) {
        const res = await fetch('/api/v1/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
          body: JSON.stringify({ email }),
        })
        expect(res.status).toBe(202)
        const body = await res.json()
        expect(body).toEqual({ status: 'queued' })
        // Must NOT echo email or expose email_dispatch_id (enumeration-defense)
        expect(body).not.toHaveProperty('email')
        expect(body).not.toHaveProperty('email_dispatch_id')
      }
    })
  })

  describe('Amendment J — title-not-error invariant', () => {
    it('all 400/403/429 responses carry title field, never error field', async () => {
      const errorRequests = [
        { url: '/api/v1/auth/signup', body: { email: 'test@example.com' }, headers: { Origin: 'https://sunfish.app' } },
        { url: '/api/v1/auth/verify-email', body: { verification_token: 'invalid-token' }, headers: { Origin: 'https://sunfish.app' } },
      ]

      for (const req of errorRequests) {
        const res = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...req.headers },
          body: JSON.stringify(req.body),
        })
        if (!res.ok) {
          const body = await res.json()
          expect(body).toHaveProperty('title')
          expect(body).not.toHaveProperty('error')
        }
      }
    })
  })
})
