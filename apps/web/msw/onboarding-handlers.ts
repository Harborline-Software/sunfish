// MSW request handlers for W#79 onboarding endpoints.
// Per spec §4.4 + §3.1-§3.3 wire-contract reconciliation tables.
//
// These handlers mirror server DTO shapes byte-for-byte.
// Discriminator strings sourced from onboarding-discriminators.ts (single source of truth).
// MSW-vs-real-Bridge parity test (onboarding-msw-parity.test.ts) verifies equality.

import { http, HttpResponse } from 'msw'
import { SignupDiscriminator } from '../src/api/onboarding-discriminators'

// Simulated state for test isolation. Reset between tests via server.resetHandlers().
let signupCallCount = 0

// Helper: RFC 7807 ProblemDetails body per Amendment J (title, NOT error; title, NOT type).
function problemDetails(title: string, status: number, detail?: string, extras?: Record<string, unknown>) {
  return { title, status, detail: detail ?? title, ...extras }
}

export const onboardingHandlers = [
  // ── POST /api/v1/auth/signup ──────────────────────────────────────────────
  // H2 always-202: returns 202 regardless of whether email is fresh/existing.
  // Error paths: slug-uniqueness + shape + captcha + rate-limit + origin.
  http.post('/api/v1/auth/signup', async ({ request }) => {
    const origin = request.headers.get('origin')
    if (!origin) {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.ORIGIN_INVALID, 403),
        { status: 403 },
      )
    }

    signupCallCount++
    if (signupCallCount > 5) {
      return new HttpResponse(
        JSON.stringify(problemDetails(SignupDiscriminator.RATE_LIMITED, 429, 'Rate limit exceeded for this endpoint.')),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/problem+json',
            'Retry-After': '60',
          },
        },
      )
    }

    const body = await request.json() as Record<string, unknown>

    if (!body.email || !body.password || !body.tenant_slug || !body.tenant_display_name || !body.captcha_token) {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.VALIDATION_FAILED, 400, 'Required field missing.'),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    const slug = String(body.tenant_slug)
    const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
    if (!SLUG_PATTERN.test(slug)) {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE, 400),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    const RESERVED = ['admin', 'www', 'api', 'app', 'demo', 'sunfish', 'support', 'billing']
    if (RESERVED.includes(slug)) {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.TENANT_SLUG_RESERVED, 400),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    if (slug === 'taken-slug') {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.TENANT_SLUG_TAKEN, 400),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    if (String(body.captcha_token) === 'captcha-fail') {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.CAPTCHA_FAILED, 400),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    // H2 always-202: fresh + unverified-existing + verified-existing all return identical envelope.
    return HttpResponse.json(
      { email_dispatch_id: `mock-dispatch-${Date.now()}` },
      { status: 202 },
    )
  }),

  // ── POST /api/v1/auth/verify-email ───────────────────────────────────────
  http.post('/api/v1/auth/verify-email', async ({ request }) => {
    const origin = request.headers.get('origin')
    if (!origin) {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.ORIGIN_INVALID, 403),
        { status: 403 },
      )
    }

    const body = await request.json() as Record<string, unknown>
    const token = String(body.verification_token ?? '')

    if (!token || token === 'invalid-token') {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.VERIFICATION_TOKEN_INVALID, 400),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    if (token === 'expired-token') {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED, 400),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }

    // H9: 200-idempotent — already-consumed token also returns 200 (same shape).
    return HttpResponse.json({
      email: 'user@example.com',
      tenant_slug: 'acme-properties',
      tenant_display_name: 'Acme Property Management',
      // No tenant_id — per §3.2 negative-match
      // No session_token — W#80 scope
    })
  }),

  // ── POST /api/v1/auth/resend-verification ─────────────────────────────────
  // Uniform-202: does NOT leak whether email is known (enumeration-defense).
  http.post('/api/v1/auth/resend-verification', async ({ request }) => {
    const origin = request.headers.get('origin')
    if (!origin) {
      return HttpResponse.json(
        problemDetails(SignupDiscriminator.ORIGIN_INVALID, 403),
        { status: 403 },
      )
    }

    // Uniform-202 regardless of email existence.
    return HttpResponse.json({ status: 'queued' }, { status: 202 })
  }),
]

// Export a reset helper so tests can zero the in-process rate-limit counter.
export function resetSignupCallCount() {
  signupCallCount = 0
}
