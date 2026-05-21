/**
 * Bridge client for the /api/v1/financial/* endpoint family.
 * W#76 cohort-2 — financial cluster rebind (Payments GET/POST + Accounting GET).
 *
 * @standing-pattern: pattern-009
 */

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
  if (!resp.ok) throw new Error(`Failed to load payments: ${resp.status} ${resp.statusText}`)
  return (await resp.json()) as PaymentList
}
