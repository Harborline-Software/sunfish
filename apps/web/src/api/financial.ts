/**
 * Bridge client for the /api/v1/financial/* endpoint family.
 * W#76 cohort-2 — financial cluster rebind (Payments GET/POST + Accounting GET).
 *
 * @standing-pattern: pattern-009
 *
 * DRAFT-MOCK STATE:
 * This file returns typed mock fixtures while Engineer ships the substrate
 * tenant-keying retrofit (W#76 PR 0a-d) and the Bridge financial endpoint family.
 *
 * MOCK_CONTRACT_VERSION: ONR hand-off §3.20 (anchor-react-rebind-cohort-2-stage06-handoff.md)
 * When Engineer files engineer-status-pr-0c-contract-frozen.md, diff PaymentSummary
 * against the frozen IPaymentRepository contract shape before swapping mock → real fetch.
 *
 * BLOCKED_ON:
 *   - Engineer PR 0a (blocks-financial-ar IInvoiceRepository tenant-keying)
 *   - Engineer PR 0c (blocks-financial-payments IPaymentRepository tenant-keying)
 *   - CIC W#76 pre-authorization ratification
 *   - signal-bridge Financial/ endpoint family (lands alongside PR 0 completion)
 *
 * Swap each mock implementation for a real fetch when the backend unblocks.
 * See: shipyard/icm/_state/handoffs/anchor-react-rebind-cohort-2-stage06-handoff.md §3.20
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

// DRAFT-MOCK: replace with real fetch when signal-bridge Financial/ family lands.
const MOCK_PAYMENTS: PaymentList = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
}

/**
 * GET /api/v1/financial/payments?leaseId=
 * Returns payments for the given lease, scoped to the authenticated tenant.
 * Cross-tenant leaseId returns empty list (diagnostic-non-leak per ADR 0092).
 *
 * DRAFT-MOCK: returns empty list fixture until backend unblocks.
 */
export async function getLeasePayments(_leaseId: string): Promise<PaymentList> {
  // TODO(W#76 PR 1): replace with real fetch
  // const qs = new URLSearchParams({ leaseId: _leaseId })
  // const resp = await fetch(`/api/v1/financial/payments?${qs}`, { credentials: 'include' })
  // if (!resp.ok) throw new Error(`Failed to load payments: ${resp.status} ${resp.statusText}`)
  // return (await resp.json()) as PaymentList
  return Promise.resolve(MOCK_PAYMENTS)
}
