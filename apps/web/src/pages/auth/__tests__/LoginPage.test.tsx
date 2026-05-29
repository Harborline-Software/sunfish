import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from '../LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual as object, useNavigate: () => mockNavigate }
})

const mockFetch = vi.fn()
global.fetch = mockFetch

function makeOk(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeProblem(status: number, title: string, detail?: string): Response {
  return new Response(JSON.stringify({ title, status, detail }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function make429(): Response {
  return new Response(null, { status: 429 })
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/auth/login']}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

function fillAndSubmit(email = 'admin@example.com', password = 'password') {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } })
  fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
  })

  it('renders email + password form', () => {
    render(<LoginPage />, { wrapper })
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('navigates to / on successful login', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOk({ token: 'csrf-pre', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(makeOk({ antiforgeryToken: 'csrf-post', antiforgeryHeaderName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(makeOk({ user: 'admin', role: 'owner' })) // whoami after login

    render(<LoginPage />, { wrapper })
    fillAndSubmit()

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('shows generic invalid-credentials message on 401', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOk({ token: 'csrf-pre', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(makeProblem(401, 'invalid_credentials'))

    render(<LoginPage />, { wrapper })
    fillAndSubmit('wrong@example.com', 'bad')

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.'),
    )
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows tenant-unresolved message on 400 tenant_unresolved', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOk({ token: 'csrf-pre', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(makeProblem(400, 'tenant_unresolved'))

    render(<LoginPage />, { wrapper })
    fillAndSubmit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('workspace could not be found'),
    )
  })

  it('shows rate-limit message on 429', async () => {
    mockFetch
      .mockResolvedValueOnce(makeOk({ token: 'csrf-pre', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(make429())

    render(<LoginPage />, { wrapper })
    fillAndSubmit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts'),
    )
  })

  it('submit button shows aria-busy while pending', async () => {
    let resolveLogin!: (v: Response) => void
    mockFetch
      .mockResolvedValueOnce(makeOk({ token: 'csrf-pre', headerName: 'X-XSRF-TOKEN' }))
      .mockReturnValueOnce(new Promise<Response>((res) => { resolveLogin = res }))

    render(<LoginPage />, { wrapper })
    fillAndSubmit()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing in/i })).toHaveAttribute('aria-busy', 'true'),
    )
    resolveLogin(makeOk({ antiforgeryToken: 'x', antiforgeryHeaderName: 'X-XSRF-TOKEN' }))
  })
})
