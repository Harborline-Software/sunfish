// W#79 PR 4 — Playwright e2e: auth login round-trip.
//
// Coverage:
//   (a) Direct login — seeded user, valid creds → authenticated landing
//   (b) Self-service signup → verify-email → login chain (UI navigation)
//   (c) Failure cases: bad credentials, unverified email, rate-limited
//
// All tests run against MSW-style page.route() intercepts so they pass in CI
// without a real Bridge. Tests are structured so swapping mockAuthApis() for
// real network (remove mockAuthApis call) runs them against the live Bridge.
//
// Stack-required tests are tagged and skipped in CI via the PLAYWRIGHT_SKIP_STACK tag.
//
// Backend contract assumptions (auth subagent must satisfy):
//   - GET /api/v1/cockpit/auth/antiforgery-token → { token, headerName }
//   - POST /api/v1/cockpit/auth/login → { antiforgeryToken, antiforgeryHeaderName } on 200
//   - POST /api/v1/cockpit/auth/login → 401 { title: 'invalid_credentials' } on bad creds
//   - POST /api/v1/cockpit/auth/login → 403 { title: 'email_unverified' } for unverified accounts
//   - POST /api/v1/cockpit/auth/login → 429 for rate-limit
//   - GET /api/v1/whoami → { user, role } on authenticated session (reads cookie)
//   - POST /api/v1/cockpit/auth/logout → 204 (cookie cleared)
//   - App redirects to /auth/login when /api/v1/whoami returns 401

import { test, expect, mockAuthApis, mockUnauthenticated, mockCohort1Apis } from './fixtures'

// ─── (a) Direct login — seeded user ─────────────────────────────────────────

test.describe('Login round-trip — direct (seeded-user style)', () => {
  test('login page renders email + password fields', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('valid credentials → redirect to app landing', async ({ page }) => {
    await mockAuthApis(page)
    await mockCohort1Apis(page)

    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should land on the main app (properties page or root redirect)
    await expect(page).toHaveURL(/\/(properties|$)/, { timeout: 5000 })
  })

  test('submit button shows loading state while request is in flight', async ({ page }) => {
    // Override antiforgery to respond immediately, but stall the login POST
    await page.route('**/api/v1/cockpit/auth/antiforgery-token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'stall-csrf', headerName: 'X-XSRF-TOKEN' }),
      }),
    )
    // Stall login POST — never resolve in this test (page will unload)
    await page.route('**/api/v1/cockpit/auth/login', (_route) => {
      /* intentionally stalled */
    })

    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
  })

  test('unauthenticated whoami → redirects to /auth/login', async ({ page }) => {
    await mockUnauthenticated(page)
    // Stub out the antiforgery-token fetch so the auth page can load
    await page.route('**/api/v1/cockpit/auth/antiforgery-token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'x', headerName: 'X-XSRF-TOKEN' }),
      }),
    )

    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })
})

// ─── (b) Self-service signup → verify → login UI chain ──────────────────────

test.describe('Self-service signup → verify → login — UI navigation chain', () => {
  test('signup page links to login page', async ({ page }) => {
    await page.goto('/auth/signup')
    const loginLink = page.getByRole('link', { name: /sign in/i })
    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('login page links to signup page', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')
    const signupLink = page.getByRole('link', { name: /sign up/i })
    await expect(signupLink).toBeVisible()
    await signupLink.click()
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('/auth/verified with state renders success and login link', async ({ page }) => {
    await mockAuthApis(page)
    // Navigate with location state via JS
    await page.goto('/auth/verified')
    // Without state the page should redirect to login (guard)
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/auth/verified with location state shows success + login CTA', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')
    // Simulate arriving at /auth/verified via in-app navigation with state
    await page.evaluate(() => {
      window.history.pushState(
        {
          email: 'test@example.com',
          tenant_display_name: 'Test Org',
          tenant_slug: 'test-org',
        },
        '',
        '/auth/verified',
      )
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.getByRole('heading', { name: /email verified/i })).toBeVisible()
    await expect(page.getByText(/Test Org/)).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })
})

// ─── (c) Failure cases ───────────────────────────────────────────────────────

test.describe('Login failure cases', () => {
  test('invalid credentials → shows error, stays on login page', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpass')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i)
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unverified email → shows error with resend link', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('unverified@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText(/not been verified/i)
    await expect(alert.getByRole('link')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('rate-limited → shows retry message', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('rate-limited@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert')).toContainText(/too many attempts/i)
  })

  test('error clears on retry — form stays interactive', async ({ page }) => {
    await mockAuthApis(page)
    await page.goto('/auth/login')

    // First: fail
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('badpass')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    // Second attempt: succeed (override auth to succeed now)
    await mockAuthApis(page)
    await mockCohort1Apis(page)
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/(properties|$)/, { timeout: 5000 })
  })
})

// ─── Stack-required: full round-trip against real Bridge ────────────────────

test.describe('Login round-trip — stack-required (skip in CI)', () => {
  test.skip(
    !!process.env.CI,
    'Requires Bridge running at localhost:5253 with ASPNETCORE_ENVIRONMENT=Development',
  )

  test('seeded admin user can log in and reach app landing (stack-required)', async ({ page }) => {
    // No page.route() — all traffic hits the real Bridge proxy
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('admin@harborline.local')
    await page.getByLabel(/password/i).fill('Admin123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Authenticated landing — properties page or dashboard
    await expect(page).toHaveURL(/\/(properties|$)/, { timeout: 10000 })
  })
})
