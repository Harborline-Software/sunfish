import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EmailVerifiedPage } from '../EmailVerifiedPage'

function renderWithState(state: object | null, route = '/auth/verified') {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: route, state }]}
      initialIndex={0}
    >
      <EmailVerifiedPage />
    </MemoryRouter>,
  )
}

describe('EmailVerifiedPage', () => {
  afterEach(() => { cleanup() })

  it('redirects to /auth/login when no location state is present', () => {
    const { container } = renderWithState(null)
    // MemoryRouter renders nothing when redirected; the Navigate component
    // pushes /auth/login — verify no verified content rendered
    expect(screen.queryByRole('heading', { name: /email verified/i })).not.toBeInTheDocument()
    expect(container.textContent).toBe('')
  })

  it('shows success heading when email is provided in location state', () => {
    renderWithState({ email: 'test@example.com' })
    expect(screen.getByRole('heading', { name: /email verified/i })).toBeInTheDocument()
  })

  it('shows tenant display name when provided', () => {
    renderWithState({
      email: 'test@example.com',
      tenant_display_name: 'Acme Properties',
      tenant_slug: 'acme',
    })
    expect(screen.getByText(/Acme Properties/)).toBeInTheDocument()
  })

  it('shows generic message when tenant_display_name is absent', () => {
    renderWithState({ email: 'test@example.com' })
    expect(screen.getByText(/has been verified/i)).toBeInTheDocument()
    expect(screen.queryByText(/Welcome to/)).not.toBeInTheDocument()
  })

  it('renders a sign-in link pointing to /auth/login', () => {
    renderWithState({ email: 'test@example.com' })
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/auth/login')
  })
})
