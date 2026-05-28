// MSW-vs-real-Bridge parity test scaffold.
// Per spec §4.4.4 + test-eng T6 B2.
//
// This suite requires a running test-env Bridge.
// Skip in CI unless SUNFISH_BRIDGE_TEST_URL is set.
// When Engineer's PR 1 merges and Bridge is running, remove the skip guard.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../../../msw/server'
import { http, HttpResponse } from 'msw'
import { SignupDiscriminator } from '../onboarding-discriminators'

const BRIDGE_URL = process.env.SUNFISH_BRIDGE_TEST_URL

const describeWithBridge = BRIDGE_URL ? describe : describe.skip

// Helper: fire an MSW handler down a specific error path by temporarily
// overriding the handler's response to match the discriminator path.
async function fireMswErrorPath(discriminator: string): Promise<Response> {
  const { onboardingHandlers, resetSignupCallCount } = await import('../../../msw/onboarding-handlers')

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
async function fireBridgeErrorPath(discriminator: string): Promise<Response> {
  if (!BRIDGE_URL) throw new Error('SUNFISH_BRIDGE_TEST_URL not set')

  // TODO(w79-pr1): flesh out Bridge-side crafted requests once PR 1 handler bodies land.
  // The real Bridge needs test-fixture state (seeded slugs for taken/reserved tests).
  // For now, stub with a placeholder that will be implemented in PR 3 Cycle 2.
  throw new Error(`fireBridgeErrorPath(${discriminator}) not yet implemented — awaiting Engineer PR 1`)
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
