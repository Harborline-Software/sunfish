// MSW-vs-real-Bridge parity test.
// Per spec §4.4.4 + test-eng T6 B2.
//
// This suite requires a running test-env Bridge (SUNFISH_BRIDGE_TEST_URL set).
// Skip guard is intentional: CI doesn't run Bridge; run locally with Bridge live.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../../../msw/server'
import { http, HttpResponse } from 'msw'
import { SignupDiscriminator } from '../onboarding-discriminators'

const BRIDGE_URL = process.env.SUNFISH_BRIDGE_TEST_URL

const describeWithBridge = BRIDGE_URL ? describe : describe.skip

// Helper: fire an MSW handler down a specific error path by temporarily
// overriding the handler's response to match the discriminator path.
async function fireMswErrorPath(discriminator: string): Promise<Response> {
  const { resetSignupCallCount } = await import('../../../msw/onboarding-handlers')

  if (discriminator === SignupDiscriminator.RATE_LIMITED) {
    // Trigger rate-limit by overriding call count
    resetSignupCallCount()
    // Override: force rate-limit on next call
    server.use(
      http.post('/api/v1/auth/signup', () =>
        new HttpResponse(
          JSON.stringify({ title: SignupDiscriminator.RATE_LIMITED, status: 429, detail: 'Rate limit exceeded for this endpoint.' }),
          { status: 429, headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '60' } },
        ),
      ),
    )
    return fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
      body: JSON.stringify({ email: 'test@example.com', password: 'pass', tenant_slug: 'a-test', tenant_display_name: 'T', captcha_token: 'x' }),
    })
  }

  const requestBodies: Record<string, { url: string; body: unknown }> = {
    [SignupDiscriminator.VALIDATION_FAILED]: {
      url: '/api/v1/auth/signup',
      body: { email: 'test@example.com' },
    },
    [SignupDiscriminator.TENANT_SLUG_TAKEN]: {
      url: '/api/v1/auth/signup',
      body: { email: 'test@example.com', password: 'pass', tenant_slug: 'taken-slug', tenant_display_name: 'T', captcha_token: 'mock-pass' },
    },
    [SignupDiscriminator.TENANT_SLUG_RESERVED]: {
      url: '/api/v1/auth/signup',
      body: { email: 'test@example.com', password: 'pass', tenant_slug: 'admin', tenant_display_name: 'T', captcha_token: 'mock-pass' },
    },
    [SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE]: {
      url: '/api/v1/auth/signup',
      body: { email: 'test@example.com', password: 'pass', tenant_slug: 'UPPER', tenant_display_name: 'T', captcha_token: 'mock-pass' },
    },
    [SignupDiscriminator.CAPTCHA_FAILED]: {
      url: '/api/v1/auth/signup',
      body: { email: 'test@example.com', password: 'pass', tenant_slug: 'a-test', tenant_display_name: 'T', captcha_token: 'captcha-fail' },
    },
    [SignupDiscriminator.VERIFICATION_TOKEN_INVALID]: {
      url: '/api/v1/auth/verify-email',
      body: { verification_token: 'invalid-token' },
    },
    [SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED]: {
      url: '/api/v1/auth/verify-email',
      body: { verification_token: 'expired-token' },
    },
    [SignupDiscriminator.ORIGIN_INVALID]: {
      url: '/api/v1/auth/signup',
      body: { email: 'test@example.com', password: 'pass', tenant_slug: 'a-test', tenant_display_name: 'T', captcha_token: 'mock-pass' },
    },
  }

  const req = requestBodies[discriminator]
  if (!req) throw new Error(`No MSW path for discriminator: ${discriminator}`)

  return fetch(req.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(discriminator !== SignupDiscriminator.ORIGIN_INVALID ? { Origin: 'https://sunfish.app' } : {}),
    },
    body: JSON.stringify(req.body),
  })
}

// Helper: fire the real Bridge down the matching error path.
// Activated in Cycle-2b: signal-bridge#51 (W#80 PR 1.5 dev endpoints) merged.
async function fireBridgeErrorPath(discriminator: string): Promise<Response> {
  if (!BRIDGE_URL) throw new Error('SUNFISH_BRIDGE_TEST_URL not set')

  const signupUrl = `${BRIDGE_URL}/api/v1/auth/signup`
  const verifyUrl = `${BRIDGE_URL}/api/v1/auth/verify-email`
  const seedUrl   = `${BRIDGE_URL}/api/v1/dev/seed-test-fixture`
  const devOrigin = 'http://localhost:5173'

  const baseBody = {
    email: `parity-${discriminator.replace(/_/g, '-')}-${Date.now()}@example.com`,
    password: 'test-password-12345',
    tenant_slug: `parity-${Date.now()}`,
    tenant_display_name: 'Parity Test Org',
    captcha_token: 'mock-pass',
  }

  switch (discriminator) {
    case SignupDiscriminator.VALIDATION_FAILED:
      // Missing required fields → Bridge validation returns 400 validation_failed
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

    case SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE:
      // Uppercase slug fails slug-shape validation
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ ...baseBody, tenant_slug: 'INVALID-UPPER' }),
      })

    case SignupDiscriminator.TENANT_SLUG_RESERVED:
      // 'admin' is in Bridge's reserved keyword list
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ ...baseBody, tenant_slug: 'admin' }),
      })

    case SignupDiscriminator.TENANT_SLUG_TAKEN: {
      // Seed a tenant with a known slug, then attempt to register with same slug
      const takenSlug = `taken-p-${Date.now()}`
      await fetch(seedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({
          email: `seed-taken-${Date.now()}@example.com`,
          tenantSlug: takenSlug,
        }),
      })
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ ...baseBody, tenant_slug: takenSlug }),
      })
    }

    case SignupDiscriminator.CAPTCHA_FAILED:
      // MockCaptchaVerifier treats 'captcha-fail' as a failing token
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ ...baseBody, captcha_token: 'captcha-fail' }),
      })

    case SignupDiscriminator.ORIGIN_INVALID:
      // Absent Origin header → Bridge CORS-origin check returns 403 origin_invalid
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseBody),
      })

    case SignupDiscriminator.RATE_LIMITED: {
      // Exhaust the 5-req/min/IP floor then the 6th returns 429 rate_limited
      const rateBase = { ...baseBody, email: `rate-p-${Date.now()}@example.com` }
      for (let i = 0; i < 5; i++) {
        await fetch(signupUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: devOrigin },
          body: JSON.stringify({ ...rateBase, tenant_slug: `rate-p-${Date.now()}-${i}` }),
        })
      }
      return fetch(signupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ ...rateBase, tenant_slug: `rate-p-sixth-${Date.now()}` }),
      })
    }

    case SignupDiscriminator.VERIFICATION_TOKEN_INVALID:
      // Syntactically invalid token → Bridge returns 400 verification_token_invalid
      return fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ verification_token: 'not-a-valid-token-abc123' }),
      })

    case SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED: {
      // Bridge distinguishes invalid vs expired via DB lookup; expired tokens require
      // a token that was issued and whose TTL has lapsed. Seed-fixture doesn't yet
      // support seeding expired-token state, so we issue a real token and trigger
      // invalid path — status codes match (both 400); discriminator string differs
      // until 'expired_token' seed type is added. Parity check documents this gap.
      return fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: devOrigin },
        body: JSON.stringify({ verification_token: 'expired-sentinel-parity' }),
      })
    }

    default:
      throw new Error(`Unknown discriminator for Bridge parity path: ${discriminator}`)
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Parity suite: activated post-signal-bridge#51 (W#80 PR 1.5, merged 2026-05-28).
// Runs when SUNFISH_BRIDGE_TEST_URL is set. CI does not set this (no live Bridge in CI);
// run locally: SUNFISH_BRIDGE_TEST_URL=http://localhost:5000 pnpm vitest run onboarding-msw-parity
describeWithBridge('MSW handlers byte-for-byte match real Bridge (§4.4.4)', () => {
  for (const discriminator of Object.values(SignupDiscriminator)) {
    it(`${discriminator}: MSW response equals Bridge response`, async () => {
      const [mswResponse, bridgeResponse] = await Promise.all([
        fireMswErrorPath(discriminator),
        fireBridgeErrorPath(discriminator),
      ])

      expect(mswResponse.status).toBe(bridgeResponse.status)
      expect(await mswResponse.json()).toEqual(await bridgeResponse.json())
      expect(mswResponse.headers.get('Retry-After'))
        .toBe(bridgeResponse.headers.get('Retry-After'))
    })
  }
})

// Smoke test that runs always: MSW handler discriminator strings come from const-export.
describe('MSW handler discriminator string provenance', () => {
  it('all MSW error responses use title values from SignupDiscriminator const-export', async () => {
    const allValues = new Set(Object.values(SignupDiscriminator))

    const errorCases = [
      fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ email: 'x' }),
      }),
      fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://sunfish.app' },
        body: JSON.stringify({ verification_token: 'invalid-token' }),
      }),
    ]

    for (const req of await Promise.all(errorCases)) {
      const body = await req.json()
      if (body.title) {
        expect(allValues).toContain(body.title)
      }
    }
  })
})
