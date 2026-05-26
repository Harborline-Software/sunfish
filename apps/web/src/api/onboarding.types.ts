// Wire shapes for W#79 onboarding endpoints.
// POSITIVE-match fields only — per ADR 0093 Rev 4 Amendment I.
// Fields the server does NOT emit MUST NOT be declared here (no tenant_id,
// no verification_token, no session_token, no password_hash).

// ── POST /api/v1/auth/signup ──────────────────────────────────────────────

export interface SignupRequest {
  email: string
  password: string
  tenant_slug: string
  tenant_display_name: string
  captcha_token: string
  // idempotency_key is an OPTIONAL header (X-Idempotency-Key), NOT a body field — per spec §3.1
}

export interface SignupAcceptedResponse {
  email_dispatch_id: string   // opaque ID for dev-mode MockEmailProvider inspection
  correlation_id: string      // for client-side telemetry; per spec §3.1 MATCH row
  // NOTE: tenant_id is NOT returned here (tenant created but unverified; per §3.1 negative-match)
  // NOTE: verification_token is NOT returned here (delivered via email only; per §3.1 negative-match)
}

// ── POST /api/v1/auth/verify-email ───────────────────────────────────────

export interface VerifyEmailRequest {
  verification_token: string  // verification token from email link query param
}

export interface VerifyEmailAcceptedResponse {
  email: string               // verified email address; per spec §3.2 MATCH row
  tenant_display_name: string // for welcome message
  tenant_slug: string         // for login redirect
  // NOTE: tenant_id and session_token are NOT returned here (per §3.2 negative-match)
}

// ── POST /api/v1/auth/resend-verification ────────────────────────────────

export interface ResendVerificationRequest {
  email: string
  captcha_token: string
}

export interface ResendVerificationAcceptedResponse {
  email_dispatch_id: string
}

// NOTE: POST /api/v1/auth/check-availability REMOVED per Admiral ruling D4 (W#79 §1.5 + §3.4)
