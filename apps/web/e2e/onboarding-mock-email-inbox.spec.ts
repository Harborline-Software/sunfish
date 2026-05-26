// W#79 PR 3 — Playwright e2e: MockEmailProvider log-safety + inbox.
// Per spec §4.4.1 + §4.4.2 cross-stack invariants.
// Requires Bridge running with MockEmailProvider (SUNFISH_ALLOW_MOCK_PROVIDERS=true).

import { test, expect } from '@playwright/test'

test.describe('W#79 onboarding — mock email inbox (ADR 0096)', () => {
  test('MockEmailProvider captures To+Subject but NOT BodyHtml/BodyText in server log (ADR 0096 Rev 2 Amendment #6)', async ({ request }) => {
    const email = `log-safety-${Date.now()}@example.com`

    await request.post('/api/v1/auth/signup', {
      data: {
        email,
        password: 'test-password-12345',
        tenant_slug: `log-safe-${Date.now()}`,
        tenant_display_name: 'Log Safety Test',
        captcha_token: 'mock-pass',
      },
      headers: { Origin: 'http://localhost:5173' },
    })

    // Fetch server logs from test-only inspection endpoint.
    const logsRes = await request.get('/api/v1/dev/bridge-logs/recent')
    expect(logsRes.ok()).toBeTruthy()
    const logs = (await logsRes.json()) as { message: string }[]
    const emailLogs = logs.filter(l => l.message.includes(email))

    // Must have at least one log entry for this email (proves MockEmailProvider ran).
    expect(emailLogs.length).toBeGreaterThan(0)

    // Must NOT contain body text or html (ADR 0096 Amendment #6).
    for (const log of emailLogs) {
      expect(log.message).not.toMatch(/BodyText|BodyHtml|body_text|body_html|html_body/i)
    }
  })

  test('in-memory MockEmailProvider store carries verification link after signup', async ({ request }) => {
    const email = `inbox-check-${Date.now()}@example.com`

    const signupRes = await request.post('/api/v1/auth/signup', {
      data: {
        email,
        password: 'test-password-12345',
        tenant_slug: `inbox-check-${Date.now()}`,
        tenant_display_name: 'Inbox Check Test',
        captcha_token: 'mock-pass',
      },
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(signupRes.status()).toBe(202)

    // Check in-memory store via test-only inspection endpoint (H1 RATIFY option c).
    const inboxRes = await request.get('/api/v1/dev/mock-email-inbox/latest')
    expect(inboxRes.ok()).toBeTruthy()
    const inbox = await inboxRes.json()

    expect(inbox.to).toBe(email)
    expect(inbox.subject).toBeDefined()
    expect(inbox.body_text).toContain('/auth/verify-email?token=')
    // Must have a token in the link.
    expect(inbox.body_text).toMatch(/token=[A-Za-z0-9._-]{10,}/)
  })

  test('server log does NOT contain verification token value', async ({ request }) => {
    const email = `token-log-check-${Date.now()}@example.com`

    await request.post('/api/v1/auth/signup', {
      data: {
        email,
        password: 'test-password-12345',
        tenant_slug: `token-log-${Date.now()}`,
        tenant_display_name: 'Token Log Test',
        captcha_token: 'mock-pass',
      },
      headers: { Origin: 'http://localhost:5173' },
    })

    // Get the actual token from inbox.
    const inboxRes = await request.get('/api/v1/dev/mock-email-inbox/latest')
    const inbox = await inboxRes.json()
    const tokenMatch = inbox.body_text.match(/token=([^&\s"]+)/)
    if (!tokenMatch) return
    const token = tokenMatch[1]

    // Ensure server logs do NOT contain the raw token value.
    const logsRes = await request.get('/api/v1/dev/bridge-logs/recent')
    const logs = (await logsRes.json()) as { message: string }[]
    for (const log of logs) {
      expect(log.message).not.toContain(token)
    }
  })
})
