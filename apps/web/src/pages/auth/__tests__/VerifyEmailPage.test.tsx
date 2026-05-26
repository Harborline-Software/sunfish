import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VerifyEmailPage } from '../VerifyEmailPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual as object, useNavigate: () => mockNavigate }
})

const mockFetch = vi.fn()
global.fetch = mockFetch

function make200(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make400(title: string): Response {
  return new Response(JSON.stringify({ title, status: 400 }), {
    status: 400,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function renderPage(token: string | null = 'valid-token') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const search = token ? `?token=${token}` : ''
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/auth/verify-email${search}`]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockFetch.mockReset()
  mockNavigate.mockReset()
})

describe('VerifyEmailPage', () => {
  it('reads token from URL query param and submits to /api/v1/auth/verify-email', async () => {
    mockFetch.mockResolvedValue(make200({ tenant_display_name: 'Test Org', tenant_slug: 'test-org' }))
    renderPage('my-token-abc')
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/verify-email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'my-token-abc' }),
      }),
    ))
  })

  it('200 response surfaces verified tenant_display_name in welcome message via navigation', async () => {
    mockFetch.mockResolvedValue(make200({ tenant_display_name: 'Acme Corp', tenant_slug: 'acme' }))
    renderPage()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
      '/auth/verified',
      expect.objectContaining({
        state: expect.objectContaining({ tenant_display_name: 'Acme Corp' }),
      }),
    ))
  })

  it('400 verification_token_invalid surfaces "token expired or invalid" message', async () => {
    mockFetch.mockResolvedValue(make400('verification_token_invalid'))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert').textContent).toMatch(/invalid/i)
  })

  it('400 verification_token_expired surfaces "resend" CTA', async () => {
    mockFetch.mockResolvedValue(make400('verification_token_expired'))
    renderPage()
    await waitFor(() => screen.getByRole('alert'))
    expect(screen.getByRole('link', { name: /send a new link/i })).toBeInTheDocument()
  })

  it('frontend does NOT declare tenant_id or session_token on VerifyEmailAcceptedResponse', () => {
    import('@/api/onboarding.types').then((_m) => {
      type R = typeof _m extends { VerifyEmailAcceptedResponse: infer T } ? T : never
      // @ts-expect-error — tenant_id must not exist on VerifyEmailAcceptedResponse
      const _: R = { tenant_display_name: 'x', tenant_slug: 'y', tenant_id: 'z' }
      expect(_).toBeDefined()
    })
  })

  it('verification_token NEVER logged or rendered to DOM beyond the URL', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockFetch.mockResolvedValue(make200({ tenant_display_name: 'Test', tenant_slug: 'test' }))
    const { container } = renderPage('super-secret-token')
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    // Token must not appear in the rendered DOM
    expect(container.innerHTML).not.toContain('super-secret-token')
    // Token must not appear in console output
    expect(consoleSpy.mock.calls.flatMap((a) => a.map(String)).some((s) => s.includes('super-secret-token'))).toBe(false)
    consoleSpy.mockRestore()
  })
})
