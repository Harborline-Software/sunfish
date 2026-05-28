import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import {
  useSignup,
  useVerifyEmail,
  useResendVerification,
  ValidationFailedError,
  TenantSlugTakenError,
  TenantSlugReservedError,
  TenantSlugInvalidShapeError,
  CaptchaFailedError,
  RateLimitedError,
  VerificationTokenInvalidError,
  VerificationTokenExpiredError,
} from '../onboarding'
import { SignupDiscriminator } from '../onboarding-discriminators'

function make400(title: string, detail?: string): Response {
  return new Response(JSON.stringify({ title, status: 400, detail }), {
    status: 400,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function make429(retryAfter = '30'): Response {
  return new Response('{}', { status: 429, headers: { 'Retry-After': retryAfter } })
}

function make403(): Response {
  return new Response('Forbidden', { status: 403 })
}

const mockFetch = global.fetch = vi.fn() as ReturnType<typeof vi.fn>

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  mockFetch.mockReset()
})

// ── Signup discriminators (5 ProblemDetails + 1 status-429 + 1 status-403) ──

describe('useSignup discriminator routing', () => {
  it(`${SignupDiscriminator.VALIDATION_FAILED} → ValidationFailedError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.VALIDATION_FAILED, 'Email is required'))
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'x', tenant_display_name: 'X', captcha_token: 't' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ValidationFailedError)
    expect((result.current.error as ValidationFailedError).cause).toBe(SignupDiscriminator.VALIDATION_FAILED)
  })

  it(`${SignupDiscriminator.TENANT_SLUG_TAKEN} → TenantSlugTakenError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.TENANT_SLUG_TAKEN))
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'taken', tenant_display_name: 'X', captcha_token: 't' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(TenantSlugTakenError)
    expect((result.current.error as TenantSlugTakenError).cause).toBe(SignupDiscriminator.TENANT_SLUG_TAKEN)
  })

  it(`${SignupDiscriminator.TENANT_SLUG_RESERVED} → TenantSlugReservedError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.TENANT_SLUG_RESERVED))
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'admin', tenant_display_name: 'X', captcha_token: 't' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(TenantSlugReservedError)
    expect((result.current.error as TenantSlugReservedError).cause).toBe(SignupDiscriminator.TENANT_SLUG_RESERVED)
  })

  it(`${SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE} → TenantSlugInvalidShapeError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE))
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'BAD', tenant_display_name: 'X', captcha_token: 't' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(TenantSlugInvalidShapeError)
    expect((result.current.error as TenantSlugInvalidShapeError).cause).toBe(SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE)
  })

  it(`${SignupDiscriminator.CAPTCHA_FAILED} → CaptchaFailedError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.CAPTCHA_FAILED))
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'x', tenant_display_name: 'X', captcha_token: 'bad' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(CaptchaFailedError)
    expect((result.current.error as CaptchaFailedError).cause).toBe(SignupDiscriminator.CAPTCHA_FAILED)
  })

  it(`${SignupDiscriminator.RATE_LIMITED} (429) → RateLimitedError with retryAfterSeconds`, async () => {
    mockFetch.mockResolvedValue(make429('45'))
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'x', tenant_display_name: 'X', captcha_token: 't' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(RateLimitedError)
    expect((result.current.error as RateLimitedError).retryAfterSeconds).toBe(45)
    expect((result.current.error as RateLimitedError).cause).toBe(SignupDiscriminator.RATE_LIMITED)
  })

  it(`${SignupDiscriminator.ORIGIN_INVALID} (403) → generic Error (not a disclosure discriminator)`, async () => {
    mockFetch.mockResolvedValue(make403())
    const { result } = renderHook(() => useSignup(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com', password: 'pw', tenant_slug: 'x', tenant_display_name: 'X', captcha_token: 't' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('origin_invalid')
  })
})

// ── Verify-email discriminators ───────────────────────────────────────────────

describe('useVerifyEmail discriminator routing', () => {
  it(`${SignupDiscriminator.VERIFICATION_TOKEN_INVALID} → VerificationTokenInvalidError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.VERIFICATION_TOKEN_INVALID))
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: makeWrapper() })
    result.current.mutate({ verification_token: 'bad-token' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(VerificationTokenInvalidError)
    expect((result.current.error as VerificationTokenInvalidError).cause).toBe(SignupDiscriminator.VERIFICATION_TOKEN_INVALID)
  })

  it(`${SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED} → VerificationTokenExpiredError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED))
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: makeWrapper() })
    result.current.mutate({ verification_token: 'expired-token' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(VerificationTokenExpiredError)
    expect((result.current.error as VerificationTokenExpiredError).cause).toBe(SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED)
  })
})

// ── Resend discriminator coverage (F6) ───────────────────────────────────────

describe('useResendVerification discriminator routing', () => {
  it(`${SignupDiscriminator.VALIDATION_FAILED} → ValidationFailedError`, async () => {
    mockFetch.mockResolvedValue(make400(SignupDiscriminator.VALIDATION_FAILED, 'Invalid email'))
    const { result } = renderHook(() => useResendVerification(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'not-an-email' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ValidationFailedError)
  })

  it(`${SignupDiscriminator.RATE_LIMITED} (429) → RateLimitedError`, async () => {
    mockFetch.mockResolvedValue(make429('60'))
    const { result } = renderHook(() => useResendVerification(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'a@b.com' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(RateLimitedError)
    expect((result.current.error as RateLimitedError).retryAfterSeconds).toBe(60)
  })
})
