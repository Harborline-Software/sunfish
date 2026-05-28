// W#79 PR 3 — Playwright e2e: happy-path signup → verify-email.
// Per spec §4.4.1 + §4.4.2.
// Requires full stack: web app + Bridge (with MockEmailProvider + InMemoryCaptchaVerifier).
// Run: PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm playwright test onboarding-happy-path

import { test, expect } from '@playwright/test'

// Requires full stack: PLAYWRIGHT_BASE_URL=http://localhost:5173 + Bridge running with:
//   - SUNFISH_ALLOW_MOCK_PROVIDERS=true (MockEmailProvider active)
//   - ASPNETCORE_ENVIRONMENT=Development (DevInspectionGate live)
// signal-bridge#51 (W#80 PR 1.5) merged — dev inspection endpoints are live.

test.describe('W#79 onboarding — happy path', () => {
  test('signup form renders all required fields', async ({ page }) => {
    await page.goto('/auth/signup')

    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await expect(page.getByLabel(/work email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByLabel(/organization name/i)).toBeVisible()
    await expect(page.getByLabel(/organization url/i)).toBeVisible()
    // G4 selector strategy: getByRole/getByLabel, never bare getByText on headings
  })

  test('full signup → verify-email → welcome (stack-required)', async ({ page, request }) => {
    const email = `e2e-test-${Date.now()}@example.com`
    const slug = `e2e-test-${Date.now()}`

    // 1. Navigate to signup and fill form.
    await page.goto('/auth/signup')
    await page.getByLabel(/work email/i).fill(email)
    await page.getByLabel(/password/i).fill('test-password-12345')
    await page.getByLabel(/organization name/i).fill('E2E Test Org')
    await page.getByLabel(/organization url/i).fill(slug)

    // CaptchaWidget in dev mode auto-fills mock-pass token via checkbox.
    await page.getByRole('checkbox', { name: /i am human/i }).check()

    // 2. Submit and expect redirect to verify-email/pending.
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/auth\/verify-email\/pending/)

    // 3. Check MockEmailProvider in-memory store for verification link.
    // Uses test-only Bridge inspection endpoint (per spec §4.4.2 H1 RATIFY option c).
    const inboxRes = await request.get('/api/v1/dev/mock-email-inbox/latest')
    expect(inboxRes.ok()).toBeTruthy()
    const inbox = await inboxRes.json()
    expect(inbox.to).toBe(email)
    expect(inbox.body_text).toContain('/auth/verify-email?token=')

    // 4. Extract verification token from email body.
    const tokenMatch = inbox.body_text.match(/token=([^&\s"]+)/)
    expect(tokenMatch).not.toBeNull()
    const token = tokenMatch![1]

    // 5. Navigate to verify-email URL.
    await page.goto(`/auth/verify-email?token=${token}`)

    // 6. Expect welcome state with tenant display name.
    await expect(page.getByRole('heading', { name: /email verified/i })).toBeVisible()
    await expect(page.getByText(/E2E Test Org/i)).toBeVisible()
    // Must NOT render the verification token in the DOM.
    const domContent = await page.content()
    expect(domContent).not.toContain(token)
  })
})
