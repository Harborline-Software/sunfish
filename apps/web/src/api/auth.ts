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

export class TenantUnresolvedError extends ProblemDetailsError {
  constructor(status: number, detail?: string) {
    super('tenant_unresolved', status, detail)
    this.name = 'TenantUnresolvedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class CsrfInvalidError extends ProblemDetailsError {
  constructor(status: number, detail?: string) {
    super('csrf_invalid', status, detail)
    this.name = 'CsrfInvalidError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class EmailUnverifiedError extends ProblemDetailsError {
  constructor(status: number, detail?: string) {
    super('email_unverified', status, detail)
    this.name = 'EmailUnverifiedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RateLimitedError extends Error {
  constructor() {
    super('Too many login attempts')
    this.name = 'RateLimitedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

const LOGIN_DISCRIMINATORS: Partial<Record<string, (s: number, d?: string) => never>> = {
  'invalid_credentials': (s, d) => { throw new InvalidCredentialsError(s, d) },
  'tenant_unresolved':   (s, d) => { throw new TenantUnresolvedError(s, d) },
  'csrf_invalid':        (s, d) => { throw new CsrfInvalidError(s, d) },
  'email_unverified':    (s, d) => { throw new EmailUnverifiedError(s, d) },
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
  if (resp.status === 429) throw new RateLimitedError()
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
