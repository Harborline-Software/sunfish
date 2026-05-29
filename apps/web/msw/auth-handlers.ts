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
    return HttpResponse.json(
      { title: 'invalid_credentials', status: 401, detail: 'Invalid email or password' },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
    )
  }),

  http.post('/api/v1/cockpit/auth/logout', () => new HttpResponse(null, { status: 204 })),
]
