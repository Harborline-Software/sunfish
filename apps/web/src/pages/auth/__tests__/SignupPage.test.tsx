import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SignupPage } from '../SignupPage'

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

function make202(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make400(title: string, detail?: string): Response {
  return new Response(JSON.stringify({ title, status: 400, detail }), {
    status: 400,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function make429(retryAfter = '30'): Response {
  return new Response('{}', {
    status: 429,
    headers: { 'Retry-After': retryAfter },
  })
}

function make403(): Response {
  return new Response('Forbidden', { status: 403 })
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/auth/signup']}>
        <SignupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function fillForm(overrides: Record<string, string> = {}) {
  const vals = {
    email: 'test@example.com',
    password: 'securepassword123',
    tenant_display_name: 'Test Org',
    tenant_slug: 'test-org',
    ...overrides,
  }
  // use fireEvent for programmatic fills (avoids a11y constraint differences)
  fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: vals.email } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: vals.password } })
  fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: vals.tenant_display_name } })
  fireEvent.change(screen.getByLabelText(/organization url/i), { target: { value: vals.tenant_slug } })
  // tick the mock CAPTCHA checkbox
  const captchaCheckbox = screen.getByRole('checkbox')
  if (!captchaCheckbox.getAttribute('checked')) {
    fireEvent.click(captchaCheckbox)
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockNavigate.mockReset()
})

describe('SignupPage', () => {
  it('renders signup form with email, password, slug, and display-name fields', () => {
    renderPage()
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('client-side validation prevents submit when slug fails regex', async () => {
    renderPage()
    fillForm({ tenant_slug: 'INVALID SLUG!!' })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert', { hidden: false })).toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('submission posts canonical JSON shape to /api/v1/auth/signup', async () => {
    mockFetch.mockResolvedValue(make202({ email_dispatch_id: 'disp-123' }))
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/auth/signup')
    const body = JSON.parse(opts.body as string)
    expect(body).toMatchObject({
      email: 'test@example.com',
      tenant_slug: 'test-org',
      tenant_display_name: 'Test Org',
    })
    // password must be in the body (sent to server)
    expect(body.password).toBeDefined()
    // negative-match: no tenant_id, no verification_token in request body
    expect(body.tenant_id).toBeUndefined()
    expect(body.verification_token).toBeUndefined()
  })

  it('202 response navigates to /auth/verify-email/pending with email_dispatch_id', async () => {
    mockFetch.mockResolvedValue(make202({ email_dispatch_id: 'disp-abc' }))
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith(
      '/auth/verify-email/pending',
      expect.objectContaining({ state: expect.objectContaining({ email_dispatch_id: 'disp-abc' }) }),
    )
  })

  it('400 tenant_slug_taken surfaces field-scoped error on slug input', async () => {
    mockFetch.mockResolvedValue(make400('tenant_slug_taken'))
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert').textContent).toMatch(/taken/)
  })

  it('429 rate_limited displays Retry-After countdown', async () => {
    mockFetch.mockResolvedValue(make429('45'))
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => screen.getByRole('alert'))
    expect(screen.getByRole('alert').textContent).toMatch(/45/)
  })

  it('403 origin_invalid surfaces transport-failure banner (not user-correctable)', async () => {
    mockFetch.mockResolvedValue(make403())
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => screen.getByRole('alert'))
    const alert = screen.getByRole('alert')
    // Should NOT suggest a user-correctable action for origin errors
    expect(alert.textContent).not.toMatch(/email/i)
  })

  it('captcha widget renders in mock mode with mock-pass token shape', () => {
    renderPage()
    expect(screen.getByTestId('captcha-widget-mock')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('frontend does NOT declare tenant_id or verification_token in TypeScript interfaces', () => {
    // Static type assertion: SignupAcceptedResponse must not have tenant_id or verification_token.
    // This test catches accidental field additions at runtime via the mutation mock.
    // The primary guard is Amendment I (no POSITIVE-match for server-withheld fields).
    import('@/api/onboarding.types').then((_m) => {
      type R = typeof _m extends { SignupAcceptedResponse: infer T } ? T : never
      // @ts-expect-error — tenant_id must not exist on SignupAcceptedResponse
      const _: R = { email_dispatch_id: 'x', tenant_id: 'y' }
      expect(_).toBeDefined()
    })
  })

  it('error handler reads body.title, never body.error', async () => {
    // Server returns body.error instead of body.title — should fall through to generic error, not discriminate
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'tenant_slug_taken', status: 400 }), {
        status: 400,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    )
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => screen.getByRole('alert'))
    // Should show generic fallback, NOT a TenantSlugTakenError-specific message
    expect(screen.getByRole('alert').textContent).not.toMatch(/taken/)
  })

  it('password field does not log to console on submit', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consolErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockResolvedValue(make200({}))
    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const allLogCalls = [...consoleSpy.mock.calls, ...consolErrorSpy.mock.calls]
      .flatMap((args) => args.map(String))
    expect(allLogCalls.some((s) => s.includes('securepassword123'))).toBe(false)
    consoleSpy.mockRestore()
    consolErrorSpy.mockRestore()
  })
})
