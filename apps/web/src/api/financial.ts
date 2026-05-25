/**
 * Bridge client for the /api/v1/financial/* endpoint family.
 * W#76 cohort-2 — financial cluster rebind (Payments GET/POST + Accounting GET).
 *
 * @standing-pattern: pattern-009
 * @candidate-pattern: pattern-010-financial-write-path
 */

import { throwFromResponse } from './problem-details'
export { ProblemDetailsError } from './problem-details'

// ── Wire-format types ──────────────────────────────────────────────────────

export interface PaymentSummary {
  paymentId: string
  leaseId: string
  receivedAt: string       // ISO 8601 date string
  amount: number
  currency: string         // ISO 4217 (e.g. 'USD')
  direction: 'Inbound' | 'Outbound'
  paymentMethod: string
  status: string
}

export interface PaymentList {
  items: PaymentSummary[]
  total: number
  page: number
  pageSize: number
}

// ── Payments GET ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/financial/payments?leaseId=
 * Returns payments for the given lease, scoped to the authenticated tenant.
 * Cross-tenant leaseId returns empty list (diagnostic-non-leak per ADR 0092).
 */
export async function getLeasePayments(leaseId: string): Promise<PaymentList> {
  const qs = new URLSearchParams({ leaseId })
  const resp = await fetch(`/api/v1/financial/payments?${qs}`, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load payments')
  return (await resp.json()) as PaymentList
}

// ── Accounting Summary ─────────────────────────────────────────────────────

export interface AccountingSummary {
  invoicedThisPeriod: number
  receivedThisPeriod: number
  outstanding: number           // total outstanding
  outstanding30Plus: number     // outstanding > 30 days overdue (exclusive lower bound)
  aging60Plus: number           // outstanding > 60 days overdue (exclusive lower bound; matches outstanding30Plus convention)
  aging60PlusCount: number      // count of invoices > 60 days overdue
  currency: string              // ISO 4217 (e.g. 'USD')
}

/**
 * GET /api/v1/financial/accounting/summary
 * Returns AR aggregates for the authenticated tenant.
 * Cross-tenant request returns zero balances (diagnostic-non-leak per ADR 0092).
 */
export async function getAccountingSummary(): Promise<AccountingSummary> {
  const resp = await fetch('/api/v1/financial/accounting/summary', { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load accounting summary')
  return (await resp.json()) as AccountingSummary
}

// ── Outstanding Invoices ───────────────────────────────────────────────────

export interface OutstandingInvoice {
  invoiceId: string
  leaseId: string
  tenantDisplayName: string
  amount: number
  currency: string              // ISO 4217
  daysOverdue: number           // 0 = current; >0 = days past due
}

export interface OutstandingInvoiceList {
  items: OutstandingInvoice[]
  total: number
}

/**
 * GET /api/v1/financial/accounting/outstanding
 * Returns per-invoice outstanding rows for the authenticated tenant.
 * Cross-tenant request returns empty list (diagnostic-non-leak per ADR 0092).
 */
export async function getAccountingOutstanding(): Promise<OutstandingInvoiceList> {
  const resp = await fetch('/api/v1/financial/accounting/outstanding', { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load outstanding invoices')
  return (await resp.json()) as OutstandingInvoiceList
}

// ── Payment write-path types ───────────────────────────────────────────────

export type PaymentErrorCode =
  | 'token-fetch-error'   // E1: CSRF token endpoint unreachable / 5xx
  | 'token-rejection'     // E2: token expired or invalid (session expired)
  | 'lease-not-found'     // E3: cross-tenant or genuinely missing lease (diagnostic-non-leak per ADR 0092)
  | 'server-error'        // E4: generic 5xx / network failure

/** Typed error that RentCollectionPage inspects to choose the correct error-state UI. */
export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: PaymentErrorCode,
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

export interface RecordPaymentInput {
  leaseId: string
  amount: number
  currency: string             // ISO 4217 uppercase (e.g. 'USD')
  direction: 'Inbound' | 'Outbound'
  paidAt?: string              // ISO timestamp; defaults to server time if absent
  externalRef?: string         // caller-supplied reference (check number, etc.)
  method?: string              // payment method (ACH/Check/Cash/Card); defaults to Cash server-side if absent
}

export interface RecordPaymentResult {
  paymentId: string
  status: string               // initial state (e.g. 'Received')
  recordedAt: string           // ISO timestamp
}

// ── Payments POST ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/financial/payments
 *
 * CSRF round-trip is internal:
 *   1. GET /api/v1/financial/antiforgery-token → csrfToken
 *   2. POST /api/v1/financial/payments with X-XSRF-TOKEN header
 *
 * Throws PaymentError with typed code so the caller can render E1/E2/E3/E4 UX.
 * Mirrors cohort-1 createWorkOrder + getCsrfToken pattern from maintenance.ts.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  // Step 1: fetch CSRF token (throws PaymentError 'token-fetch-error' on failure → E1)
  let csrfToken: string
  try {
    const tokenResp = await fetch('/api/v1/financial/antiforgery-token', { credentials: 'include' })
    if (!tokenResp.ok) throw new Error(`Token fetch failed: ${tokenResp.status}`)
    const body = (await tokenResp.json()) as { token: string }
    csrfToken = body.token
  } catch {
    throw new PaymentError("Couldn't reach the payment service.", 'token-fetch-error')
  }

  // Step 2: POST (distinguishes E2/E3/E4 by status + body)
  const resp = await fetch('/api/v1/financial/payments', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
    body: JSON.stringify(input),
  })
  if (!resp.ok) {
    if (resp.status === 419 || resp.status === 403) {
      throw new PaymentError('Session expired.', 'token-rejection')   // → E2
    }
    if (resp.status === 400) {
      const text = await resp.text()
      if (/lease|not.found/i.test(text)) {
        throw new PaymentError("Couldn't find that lease.", 'lease-not-found')   // → E3
      }
    }
    throw new PaymentError(`Payment failed: ${resp.status}`, 'server-error')   // → E4
  }
  return (await resp.json()) as RecordPaymentResult
}
