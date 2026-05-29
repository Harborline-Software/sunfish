import { http, HttpResponse } from 'msw'

export const authHandlers = [
  http.get('/api/v1/cockpit/auth/antiforgery-token', () =>
    HttpResponse.json({ token: 'msw-csrf-token', headerName: 'X-XSRF-TOKEN' }),
  ),

  http.post('/api/v1/cockpit/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (body.email === 'admin@example.com' && body.password === 'password') {
      return HttpResponse.json({
        antiforgeryToken: 'msw-post-auth-csrf-token',
        antiforgeryHeaderName: 'X-XSRF-TOKEN',
      })
    }
    if (body.email === 'rate-limited@example.com') {
      return new HttpResponse(null, { status: 429 })
    }
    if (body.email === 'bad-tenant@example.com') {
      return HttpResponse.json(
        { title: 'tenant_unresolved', status: 400, detail: 'Subdomain not found' },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    return HttpResponse.json(
      { title: 'invalid_credentials', status: 401, detail: 'Invalid email or password' },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
    )
  }),

  http.post('/api/v1/cockpit/auth/logout', () => new HttpResponse(null, { status: 204 })),
]
