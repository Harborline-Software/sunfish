import { throwFromResponse, ProblemDetailsError } from './problem-details'

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { antiforgeryToken: string; antiforgeryHeaderName: string }
export interface AntiforgeryTokenResponse { token: string; headerName: string }

export class InvalidCredentialsError extends ProblemDetailsError {
  constructor(status: number, detail?: string) {
    super('invalid_credentials', status, detail)
    this.name = 'InvalidCredentialsError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

const LOGIN_DISCRIMINATORS: Partial<Record<string, (s: number, d?: string) => never>> = {
  'invalid_credentials': (s, d) => { throw new InvalidCredentialsError(s, d) },
}

export async function getAntiforgeryToken(): Promise<AntiforgeryTokenResponse> {
  const resp = await fetch('/api/v1/cockpit/auth/antiforgery-token', { credentials: 'include' })
  if (!resp.ok) await throwFromResponse(resp, 'Failed to fetch antiforgery token')
  return resp.json() as Promise<AntiforgeryTokenResponse>
}

export async function loginRequest(req: LoginRequest, csrfToken: string): Promise<LoginResponse> {
  const resp = await fetch('/api/v1/cockpit/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify(req),
  })
  if (!resp.ok) await throwFromResponse(resp, 'Login failed', LOGIN_DISCRIMINATORS)
  return resp.json() as Promise<LoginResponse>
}

export async function logoutRequest(csrfToken: string): Promise<void> {
  const resp = await fetch('/api/v1/cockpit/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-XSRF-TOKEN': csrfToken },
  })
  if (!resp.ok) await throwFromResponse(resp, 'Logout failed')
}
