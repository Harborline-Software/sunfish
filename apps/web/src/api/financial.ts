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

// ── Accounting Summary ─────────────────────────────────────────────────────

export interface AccountingSummary {
  invoicedThisPeriod: number
  receivedThisPeriod: number
  outstanding: number           // total outstanding
  outstanding30Plus: number     // outstanding > 30 days overdue
  aging60Plus: number           // outstanding ≥ 60 days overdue
  aging60PlusCount: number      // count of invoices ≥ 60 days overdue
  currency: string              // ISO 4217 (e.g. 'USD')
}

const MOCK_ACCOUNTING_SUMMARY: AccountingSummary = {
  invoicedThisPeriod: 0,
  receivedThisPeriod: 0,
  outstanding: 0,
  outstanding30Plus: 0,
  aging60Plus: 0,
  aging60PlusCount: 0,
  currency: 'USD',
}

/**
 * GET /api/v1/financial/accounting/summary
 * Returns AR aggregates for the authenticated tenant.
 * Cross-tenant request returns zero balances (diagnostic-non-leak per ADR 0092).
 *
 * DRAFT-MOCK: returns zero-balance fixture until backend unblocks.
 */
export async function getAccountingSummary(): Promise<AccountingSummary> {
  // TODO(W#76 PR 2): replace with real fetch
  // const resp = await fetch('/api/v1/financial/accounting/summary', { credentials: 'include' })
  // if (!resp.ok) throw new Error(`Failed to load accounting summary: ${resp.status} ${resp.statusText}`)
  // return (await resp.json()) as AccountingSummary
  return Promise.resolve(MOCK_ACCOUNTING_SUMMARY)
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

const MOCK_OUTSTANDING: OutstandingInvoiceList = {
  items: [],
  total: 0,
}

/**
 * GET /api/v1/financial/accounting/outstanding
 * Returns per-invoice outstanding rows for the authenticated tenant.
 * Cross-tenant request returns empty list (diagnostic-non-leak per ADR 0092).
 *
 * DRAFT-MOCK: returns empty fixture until backend unblocks.
 */
export async function getAccountingOutstanding(): Promise<OutstandingInvoiceList> {
  // TODO(W#76 PR 2): replace with real fetch
  // const resp = await fetch('/api/v1/financial/accounting/outstanding', { credentials: 'include' })
  // if (!resp.ok) throw new Error(`Failed to load outstanding invoices: ${resp.status} ${resp.statusText}`)
  // return (await resp.json()) as OutstandingInvoiceList
  return Promise.resolve(MOCK_OUTSTANDING)
}
