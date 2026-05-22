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

// forward-watch: engineer-contract-frozen — ChartId wire format (string UUID vs opaque string vs object)
export type ChartId = string

// forward-watch: engineer-contract-frozen — chart-list endpoint shape
export interface ChartSummary {
  chartId: ChartId
  displayName: string
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
// forward-watch: engineer-contract-frozen — CSV export endpoint convention
//   (Accept-header vs /export route suffix; placeholder uses /export route)
// -------------------------------------------------------------------------

async function exportReportCsv(kind: string, params: unknown, filename: string): Promise<void> {
  const resp = await fetch(`/api/v1/reports/${kind}/export`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!resp.ok) throw new Error(`CSV export failed: ${resp.status} ${resp.statusText}`)
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportTrialBalanceCsv(params: TrialBalanceParameters, filename: string) {
  return exportReportCsv('trial-balance', params, filename)
}

export function exportArAgingSummaryCsv(params: ArAgingSummaryParameters, filename: string) {
  return exportReportCsv('ar-aging-summary', params, filename)
}

export function exportProfitAndLossByPropertyCsv(params: ProfitAndLossByPropertyParameters, filename: string) {
  return exportReportCsv('profit-and-loss-by-property', params, filename)
}

export function exportRentRollCsv(params: RentRollParameters, filename: string) {
  return exportReportCsv('rent-roll', params, filename)
}

// -------------------------------------------------------------------------
// Chart list
// forward-watch: engineer-contract-frozen — chart-list endpoint path
// -------------------------------------------------------------------------

export async function getCharts(): Promise<ChartListResponse> {
  const resp = await fetch('/api/v1/reports/charts', { credentials: 'include' })
  if (!resp.ok) throw new Error(`Failed to load charts: ${resp.status} ${resp.statusText}`)
  return (await resp.json()) as ChartListResponse
}
