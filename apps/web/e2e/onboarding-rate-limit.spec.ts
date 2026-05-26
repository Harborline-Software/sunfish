// W#79 PR 3 — Playwright e2e: rate-limit floor.
// Per spec §4.4.1 + §3.7 rate-limit floors + §4.4.2 cross-stack invariants.
// Requires full stack with Bridge rate-limit policies configured (5/min/IP for signup).

import { test, expect } from '@playwright/test'

test.describe('W#79 onboarding — rate-limit floor (§3.7)', () => {
  test('6th rapid signup from same origin → 429 with Retry-After UX', async ({ page, request }) => {
    // Fire 5 signups directly (API level to avoid form UX overhead).
    const baseBody = {
      email: 'rate-test@example.com',
      password: 'test-password-12345',
      tenant_slug: `rate-test-${Date.now()}`,
      tenant_display_name: 'Rate Test Org',
      captcha_token: 'mock-pass',
    }

    for (let i = 0; i < 5; i++) {
      const res = await request.post('/api/v1/auth/signup', {
        data: { ...baseBody, tenant_slug: `rate-test-${Date.now()}-${i}` },
        headers: { Origin: page.url() || 'http://localhost:5173' },
      })
      // First 5 should succeed (202) or return known 400s; not 429.
      expect(res.status()).not.toBe(429)
    }

    // 6th request should return 429.
    const sixthRes = await request.post('/api/v1/auth/signup', {
      data: { ...baseBody, tenant_slug: `rate-test-sixth-${Date.now()}` },
      headers: { Origin: page.url() || 'http://localhost:5173' },
    })
    expect(sixthRes.status()).toBe(429)
    expect(sixthRes.headers()['retry-after']).toBeDefined()

    const body = await sixthRes.json()
    expect(body.title).toBe('rate_limited')
    expect(body).not.toHaveProperty('error')
  })

  test('rate-limit UI: 429 response surfaces Retry-After countdown', async ({ page }) => {
    // Navigate to signup page and verify that when the server returns 429,
    // the UI displays the retry-after countdown message.
    await page.goto('/auth/signup')

    // Mock: override endpoint to return 429 immediately.
    await page.route('/api/v1/auth/signup', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/problem+json',
        headers: { 'Retry-After': '30' },
        body: JSON.stringify({ title: 'rate_limited', status: 429, detail: 'Rate limit exceeded for this endpoint.' }),
      })
    })

    await page.getByLabel(/work email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('test-password-12345')
    await page.getByLabel(/organization name/i).fill('Test Org')
    await page.getByLabel(/organization url/i).fill('test-org-rate')
    await page.getByRole('checkbox', { name: /i am human/i }).check()
    await page.getByRole('button', { name: /create account/i }).click()

    // UI should show retry countdown (contains seconds value from Retry-After).
    await expect(page.getByRole('alert')).toContainText(/30/)
  })
})
