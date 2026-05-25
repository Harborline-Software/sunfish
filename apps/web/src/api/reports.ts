/**
 * Bridge client for /api/v1/reports — pattern-013-cartridge-read-via-post.
 * Each report kind is run via POST with its parameters as the request body.
 * The endpoint family is authored in blocks-reports (W#77) and exposed by
 * signal-bridge under /api/v1/reports/{kind}.
 *
 * @standing-pattern: pattern-013-cartridge-read-via-post
 * @candidate-pattern: pattern-015-provisional-report-surface
 * @candidate-pattern: pattern-016-run-on-demand-report
 * @candidate-pattern: pattern-017-csv-export-affordance
 */

// ChartId wire format: naked JSON string (opaque). Default value is Guid.ToString();
// the demo tenant uses a human-readable key. Treat as opaque — do NOT assume GUID format.
// CONTRACT-FROZEN 2026-05-25 via engineer-status-2026-05-25T1458Z-cohort-3-contract-frozen-chartid-wire-format
export type ChartId = string

// chart-list endpoint wire shape — beacon 2/3 frozen contract.
// CONTRACT-FROZEN 2026-05-25 via engineer-status-2026-05-25T1458Z-cohort-3-contract-frozen-chart-list-endpoint
export interface ChartSummary {
  chartId: ChartId
  name: string
  baseCurrency: string
}

export interface ChartListResponse {
  charts: ChartSummary[]
}

// ReportRunResult<TResult> envelope — mirrors blocks-reports ReportRunResult<T>
export interface ReportRunResult<TResult> {
  kind: string
  result: TResult
  runAtUtc: string
  snapshotMarker: string
  runDuration: string
  isProvisional: boolean
  warnings: string[]
}

// -------------------------------------------------------------------------
// Trial Balance
// -------------------------------------------------------------------------

export interface TrialBalanceParameters {
  chartId: ChartId
  fiscalPeriodId?: string | null
  asOfDate?: string | null
  includeZeroBalanceAccounts?: boolean
  includeInactiveAccounts?: boolean
}

export type GLAccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

export interface TrialBalanceRow {
  accountId: string
  accountCode: string
  accountName: string
  accountType: GLAccountType
  debitBalance: number
  creditBalance: number
}

export interface TrialBalanceResult {
  chartId: ChartId
  asOf: string
  periodId: string | null
  rows: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  isProvisional: boolean
  warnings: string[]
}

// -------------------------------------------------------------------------
// AR Aging Summary
// -------------------------------------------------------------------------

export interface ArAgingSummaryParameters {
  chartId: ChartId
  asOfDate?: string | null
  customerIds?: string[] | null
  propertyIds?: string[] | null
  topDelinquentN?: number
}

export interface ArAgingSummaryRow {
  groupKey: string
  groupLabel: string
  current: number
  days0To30: number
  days31To60: number
  days61To90: number
  days90Plus: number
  totalOpen: number
}

export interface TopDelinquentCustomer {
  customerId: string
  customerName: string
  days90PlusBalance: number
  totalOpenBalance: number
}

export interface ArAgingSummaryResult {
  chartId: ChartId
  asOf: string
  byCustomer: ArAgingSummaryRow[]
  byProperty: ArAgingSummaryRow[]
  totals: ArAgingSummaryRow
  topDelinquent: TopDelinquentCustomer[]
}

// -------------------------------------------------------------------------
// Profit and Loss by Property
// -------------------------------------------------------------------------

export interface ProfitAndLossByPropertyParameters {
  chartId: ChartId
  periodStart?: string | null
  periodEnd?: string | null
  propertyIds?: string[] | null
  includeZeroBalanceAccounts?: boolean
}

export interface ProfitAndLossAccountLine {
  accountId: string
  accountCode: string
  accountName: string
  amount: number
}

export interface ProfitAndLossByPropertyRow {
  propertyKey: string
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  revenueLines: ProfitAndLossAccountLine[]
  expenseLines: ProfitAndLossAccountLine[]
}

export interface ProfitAndLossByPropertyTotals {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

export interface ProfitAndLossByPropertyResult {
  chartId: ChartId
  periodStart: string | null
  periodEnd: string
  byProperty: ProfitAndLossByPropertyRow[]
  totals: ProfitAndLossByPropertyTotals
}

// -------------------------------------------------------------------------
// Rent Roll
// -------------------------------------------------------------------------

export interface RentRollParameters {
  chartId: ChartId
  asOfDate?: string | null
  propertyAuthorityKeys?: string[] | null
  expiringWindowDays?: number
  includeVacant?: boolean
}

export type OccupancyStatus = 'Occupied' | 'Vacant' | 'NoticeGiven' | 'OffMarket'
export type ArAgingBucket = 'Current' | 'Days0To30' | 'Days31To60' | 'Days61To90' | 'Days90Plus' | 'NoBalance'
export type VacancyReason = 'EndOfTerm' | 'Turnover' | 'Eviction' | 'NeverLeased' | 'OffMarket'

export interface RentRollUnitRow {
  unitLabel: string
  currentLeaseId: string | null
  tenantId: string | null
  tenantName: string | null
  leaseStart: string | null
  leaseEnd: string | null
  expiringSoon: boolean
  monthlyRent: number
  projectedNextMonthRent: number
  lastPaymentDate: string | null
  prepaidBalance: number
  openBalance: number
  delinquencyBucket: ArAgingBucket
  status: OccupancyStatus
  vacancyReason: VacancyReason | null
}

export interface RentRollPropertySummary {
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  monthlyRentTotal: number
  monthlyRentTotalIfFullyLeased: number
  openBalanceTotal: number
}

export interface RentRollPropertyBlock {
  propertyKey: string
  propertyName: string
  units: RentRollUnitRow[]
  summary: RentRollPropertySummary
}

export interface RentRollPortfolioSummary {
  propertiesCovered: number
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  monthlyRentTotal: number
  openBalanceTotal: number
}

export interface RentRollResult {
  asOf: string
  properties: RentRollPropertyBlock[]
  portfolio: RentRollPortfolioSummary
}

// -------------------------------------------------------------------------
// Fetch functions — pattern-013-cartridge-read-via-post
// -------------------------------------------------------------------------

async function runReport<TParams, TResult>(kind: string, params: TParams): Promise<ReportRunResult<TResult>> {
  const resp = await fetch(`/api/v1/reports/${kind}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!resp.ok) throw new Error(`Report run failed: ${resp.status} ${resp.statusText}`)
  return (await resp.json()) as ReportRunResult<TResult>
}

export function runTrialBalance(params: TrialBalanceParameters) {
  return runReport<TrialBalanceParameters, TrialBalanceResult>('trial-balance', params)
}

export function runArAgingSummary(params: ArAgingSummaryParameters) {
  return runReport<ArAgingSummaryParameters, ArAgingSummaryResult>('ar-aging-summary', params)
}

export function runProfitAndLossByProperty(params: ProfitAndLossByPropertyParameters) {
  return runReport<ProfitAndLossByPropertyParameters, ProfitAndLossByPropertyResult>('profit-and-loss-by-property', params)
}

export function runRentRoll(params: RentRollParameters) {
  return runReport<RentRollParameters, RentRollResult>('rent-roll', params)
}

// -------------------------------------------------------------------------
// CSV export functions — pattern-017-csv-export-affordance
// CONTRACT-FROZEN 2026-05-25 via engineer-status-2026-05-25T1458Z-cohort-3-contract-frozen-csv-export-convention
//
// CSV export uses Accept: text/csv content-negotiation on the SAME POST endpoint.
// Body params are identical for JSON and CSV runs. No separate /export route.
// Server returns Content-Disposition: attachment; filename="<kind>-<date>.csv".
// -------------------------------------------------------------------------

async function exportReportCsv(kind: string, params: unknown): Promise<void> {
  const resp = await fetch(`/api/v1/reports/${kind}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/csv',
    },
    body: JSON.stringify(params),
  })
  if (!resp.ok) throw new Error(`CSV export failed: ${resp.status} ${resp.statusText}`)
  // Prefer server-supplied filename from Content-Disposition header
  const disposition = resp.headers.get('Content-Disposition') ?? ''
  const nameMatch = /filename="([^"]+)"/.exec(disposition)
  const filename = nameMatch?.[1] ?? `${kind}.csv`
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportTrialBalanceCsv(params: TrialBalanceParameters) {
  return exportReportCsv('trial-balance', params)
}

export function exportArAgingSummaryCsv(params: ArAgingSummaryParameters) {
  return exportReportCsv('ar-aging-summary', params)
}

export function exportProfitAndLossByPropertyCsv(params: ProfitAndLossByPropertyParameters) {
  return exportReportCsv('profit-and-loss-by-property', params)
}

export function exportRentRollCsv(params: RentRollParameters) {
  return exportReportCsv('rent-roll', params)
}

// -------------------------------------------------------------------------
// Chart list — GET /api/v1/charts
// CONTRACT-FROZEN 2026-05-25 via engineer-status-2026-05-25T1458Z-cohort-3-contract-frozen-chart-list-endpoint
// Tenant is server-derived from session (ADR 0092 §A3). No tenant param from client.
// Returns { charts: [] } when no chart configured (do not differentiate "unknown tenant"
// from "no chart" — ADR 0092 §A3 uniform empty surface).
// -------------------------------------------------------------------------

export async function getCharts(): Promise<ChartListResponse> {
  const resp = await fetch('/api/v1/charts', { credentials: 'include' })
  if (!resp.ok) throw new Error(`Failed to load charts: ${resp.status} ${resp.statusText}`)
  return (await resp.json()) as ChartListResponse
}
