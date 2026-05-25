/**
 * TrialBalancePage — cohort-3 PR 4
 *
 * Canonical exercise of:
 *   @standing-pattern: pattern-013-cartridge-read-via-post
 *   @candidate-pattern: pattern-015-provisional-report-surface
 *   @candidate-pattern: pattern-016-run-on-demand-report
 *   @candidate-pattern: pattern-017-csv-export-affordance
 *
 * State machine: IDLE → READY_TO_RUN → LOADING → SUCCESS | EMPTY | ERROR
 * Filter changes after a result reset back to IDLE (form params vs submitted params separation).
 */
import { useState, useCallback, useMemo } from 'react'
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { CurrencyAmount } from '@sunfish/ui-react'
import { useTrialBalance } from '@/hooks/useReports'
import { exportTrialBalanceCsv } from '@/api/reports'
import type { GLAccountType, TrialBalanceRow, TrialBalanceResult } from '@/api/reports'
import { ProvisionalityBanner } from '@/components/ProvisionalityBanner'
import { ExportCsvButton } from '@/components/ExportCsvButton'
import { ReportFilterBar } from '@/components/ReportFilterBar'
import { ChartSelector } from '@/components/ChartSelector'
import { ErrorSurface } from '@/components/ErrorSurface'
import type { ChartId } from '@/api/reports'

// ---------------------------------------------------------------------------
// GL account type pill — inlined because StatusPill kind="glAccountType" is
// pending shipyard#138; matches the canonical token map from tokens.md Q6.
// ---------------------------------------------------------------------------

const GL_ACCOUNT_TYPE_CLASSES: Record<GLAccountType, string> = {
  Asset: 'bg-blue-100 text-blue-700',
  Liability: 'bg-purple-100 text-purple-700',
  Equity: 'bg-slate-100 text-slate-700',
  Revenue: 'bg-green-100 text-green-700',
  Expense: 'bg-amber-100 text-amber-800',
}

function GlAccountTypePill({ type }: { type: GLAccountType }) {
  const classes = GL_ACCOUNT_TYPE_CLASSES[type] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {type}
    </span>
  )
}

// ---------------------------------------------------------------------------
// BalanceBadge — thin diagnostic pill below tfoot
// Pending StatusPill kind="balanceState" from shipyard#138; inlined here.
// ---------------------------------------------------------------------------

function BalanceBadge({ result }: { result: TrialBalanceResult }) {
  if (result.isBalanced) {
    return (
      <div
        role="status"
        className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
      >
        <CheckIcon className="h-4 w-4" aria-hidden="true" />
        Balanced
      </div>
    )
  }

  const delta = Math.abs(result.totalDebit - result.totalCredit)
  return (
    <div
      role="status"
      className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
    >
      <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
      Out of balance by <CurrencyAmount amount={delta} className="ml-1" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// TrialBalanceTable — page-local; not promoted in cohort-3
// ---------------------------------------------------------------------------

function TrialBalanceTable({ result }: { result: TrialBalanceResult }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="w-[110px] border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500"
                >
                  ACCOUNT CODE
                </th>
                <th
                  scope="col"
                  className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500"
                >
                  ACCOUNT NAME
                </th>
                <th
                  scope="col"
                  className="w-[110px] border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500"
                >
                  TYPE
                </th>
                <th
                  scope="col"
                  className="w-[130px] border-b border-gray-200 px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-gray-500"
                >
                  DEBIT
                </th>
                <th
                  scope="col"
                  className="w-[130px] border-b border-gray-200 px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-gray-500"
                >
                  CREDIT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {result.rows.map((row: TrialBalanceRow) => (
                <tr key={row.accountId} className="hover:bg-gray-50">
                  <td className="w-[110px] px-4 py-2.5 font-mono text-sm text-gray-900">
                    {row.accountCode}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{row.accountName}</td>
                  <td className="w-[110px] px-4 py-2.5">
                    <GlAccountTypePill type={row.accountType} />
                  </td>
                  <td
                    className="w-[130px] px-4 py-2.5 text-right tabular-nums text-gray-900"
                    aria-label={row.debitBalance === 0 ? 'No balance' : undefined}
                  >
                    {row.debitBalance === 0 ? (
                      <span className="text-gray-400" aria-hidden="true">—</span>
                    ) : (
                      <CurrencyAmount amount={row.debitBalance} />
                    )}
                  </td>
                  <td
                    className="w-[130px] px-4 py-2.5 text-right tabular-nums text-gray-900"
                    aria-label={row.creditBalance === 0 ? 'No balance' : undefined}
                  >
                    {row.creditBalance === 0 ? (
                      <span className="text-gray-400" aria-hidden="true">—</span>
                    ) : (
                      <CurrencyAmount amount={row.creditBalance} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td
                  colSpan={3}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-900"
                >
                  TOTAL
                </td>
                <td className="w-[130px] px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-gray-900">
                  <CurrencyAmount amount={result.totalDebit} />
                </td>
                <td className="w-[130px] px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-gray-900">
                  <CurrencyAmount amount={result.totalCredit} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Period mode toggle — mutually exclusive Date | Fiscal period tabs
// ---------------------------------------------------------------------------

type PeriodMode = 'date' | 'fiscal'

interface PeriodModeToggleProps {
  mode: PeriodMode
  onModeChange: (mode: PeriodMode) => void
  asOfDate: string
  onAsOfDateChange: (v: string) => void
  fiscalPeriodId: string | null
  onFiscalPeriodIdChange: (v: string | null) => void
}

function PeriodModeToggle({
  mode,
  onModeChange,
  asOfDate,
  onAsOfDateChange,
  fiscalPeriodId,
  onFiscalPeriodIdChange,
}: PeriodModeToggleProps) {
  function switchMode(next: PeriodMode) {
    onModeChange(next)
    if (next === 'date') {
      onFiscalPeriodIdChange(null)
    } else {
      // fiscal selected — keep asOfDate value for if user toggles back, but
      // canRun will exclude it
    }
  }

  const tabBase =
    'px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
  const activeTab = `${tabBase} bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300`
  const inactiveTab = `${tabBase} text-gray-500 hover:text-gray-700`

  return (
    <div className="flex flex-col gap-1.5">
      <div role="tablist" aria-label="Period mode" className="inline-flex rounded-lg bg-gray-100 p-0.5 gap-0.5">
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'date'}
          onClick={() => switchMode('date')}
          className={mode === 'date' ? activeTab : inactiveTab}
        >
          Date
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'fiscal'}
          onClick={() => switchMode('fiscal')}
          className={mode === 'fiscal' ? activeTab : inactiveTab}
        >
          Fiscal period
        </button>
      </div>
      {mode === 'date' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="tb-as-of-date" className="text-xs font-medium text-gray-500">
            As of
          </label>
          <input
            id="tb-as-of-date"
            type="date"
            value={asOfDate}
            onChange={(e) => onAsOfDateChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      {mode === 'fiscal' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="tb-fiscal-period" className="text-xs font-medium text-gray-500">
            Fiscal period ID
          </label>
          <input
            id="tb-fiscal-period"
            type="text"
            placeholder="e.g. FY2026-Q1"
            value={fiscalPeriodId ?? ''}
            onChange={(e) => onFiscalPeriodIdChange(e.target.value || null)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton rows — LOADING state
// ---------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <div aria-busy="true" className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <span className="sr-only">Loading trial balance</span>
      <div className="divide-y divide-gray-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3">
            <div className="h-8 w-[110px] animate-pulse rounded bg-gray-100" />
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-[110px] animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-[130px] animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-[130px] animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TrialBalancePage — main component
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

interface FormParams {
  chartId: ChartId | null
  periodMode: PeriodMode
  asOfDate: string
  fiscalPeriodId: string | null
  includeZeroBalanceAccounts: boolean
  includeInactiveAccounts: boolean
}

export function TrialBalancePage() {
  // ---- form state (editable filters) ----
  const [formParams, setFormParams] = useState<FormParams>({
    chartId: null,
    periodMode: 'date',
    asOfDate: todayIso(),
    fiscalPeriodId: null,
    includeZeroBalanceAccounts: false,
    includeInactiveAccounts: false,
  })

  // ---- submitted state (the params used for the last successful / failed run) ----
  const [submittedResult, setSubmittedResult] = useState<TrialBalanceResult | null>(null)
  const [hasResult, setHasResult] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [lastSubmittedParams, setLastSubmittedParams] = useState<FormParams | null>(null)

  const mutation = useTrialBalance()

  // Reset result when filters change after a run
  function handleFormChange<K extends keyof FormParams>(key: K, value: FormParams[K]) {
    setFormParams((prev) => ({ ...prev, [key]: value }))
    if (hasResult || hasError) {
      setHasResult(false)
      setHasError(false)
      setSubmittedResult(null)
    }
  }

  // canRun: chartId set AND (asOfDate set OR fiscalPeriodId set), per TrialBalanceParameters contract
  const canRun = useMemo(() => {
    if (!formParams.chartId) return false
    if (formParams.periodMode === 'date') return !!formParams.asOfDate
    return !!formParams.fiscalPeriodId
  }, [formParams])

  const isRunning = mutation.isPending

  function handleRun() {
    if (!canRun || isRunning || !formParams.chartId) return
    const params = {
      chartId: formParams.chartId,
      ...(formParams.periodMode === 'date'
        ? { asOfDate: formParams.asOfDate }
        : { fiscalPeriodId: formParams.fiscalPeriodId }),
      includeZeroBalanceAccounts: formParams.includeZeroBalanceAccounts,
      includeInactiveAccounts: formParams.includeInactiveAccounts,
    }
    setLastSubmittedParams(formParams)
    mutation.mutate(params, {
      onSuccess(data) {
        setSubmittedResult(data.result)
        setHasResult(true)
        setHasError(false)
      },
      onError(err) {
        setHasError(true)
        setHasResult(false)
        setSubmittedResult(null)
      },
    })
  }

  function handleRetry() {
    if (!lastSubmittedParams) return
    setHasError(false)
    handleRun()
  }

  // CSV export — server supplies filename via Content-Disposition (pattern-017)
  const handleExportCsv = useCallback(async () => {
    if (!submittedResult || !lastSubmittedParams?.chartId) return
    const params = {
      chartId: lastSubmittedParams.chartId,
      ...(lastSubmittedParams.periodMode === 'date'
        ? { asOfDate: lastSubmittedParams.asOfDate }
        : { fiscalPeriodId: lastSubmittedParams.fiscalPeriodId }),
      includeZeroBalanceAccounts: lastSubmittedParams.includeZeroBalanceAccounts,
      includeInactiveAccounts: lastSubmittedParams.includeInactiveAccounts,
    }
    await exportTrialBalanceCsv(params)
  }, [submittedResult, lastSubmittedParams])

  // Determine page state
  type PageState = 'IDLE' | 'READY_TO_RUN' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR'
  let pageState: PageState = 'IDLE'
  if (isRunning) {
    pageState = 'LOADING'
  } else if (hasResult && submittedResult) {
    pageState = submittedResult.rows.length === 0 ? 'EMPTY' : 'SUCCESS'
  } else if (hasError) {
    pageState = 'ERROR'
  } else if (canRun) {
    pageState = 'READY_TO_RUN'
  }

  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Trial Balance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Account balances as of a date, with debit and credit totals
        </p>
      </div>

      {/* Provisionality banner — pattern-015; above filter bar; SUCCESS only */}
      {pageState === 'SUCCESS' && submittedResult && (
        <ProvisionalityBanner
          isProvisional={submittedResult.isProvisional}
          warnings={submittedResult.warnings}
        />
      )}

      {/* Filter bar — pattern-016 */}
      <ReportFilterBar
        onRun={handleRun}
        canRun={canRun}
        isRunning={isRunning}
        exportButton={
          <ExportCsvButton
            enabled={pageState === 'SUCCESS'}
            onExport={handleExportCsv}
          />
        }
      >
        {/* Chart selector */}
        <ChartSelector
          value={formParams.chartId}
          onChange={(id) => handleFormChange('chartId', id)}
          required
        />

        {/* Period mode toggle — Date | Fiscal period */}
        <PeriodModeToggle
          mode={formParams.periodMode}
          onModeChange={(m) => handleFormChange('periodMode', m)}
          asOfDate={formParams.asOfDate}
          onAsOfDateChange={(v) => handleFormChange('asOfDate', v)}
          fiscalPeriodId={formParams.fiscalPeriodId}
          onFiscalPeriodIdChange={(v) => handleFormChange('fiscalPeriodId', v)}
        />

        {/* Boolean toggles */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formParams.includeZeroBalanceAccounts}
              onChange={(e) => handleFormChange('includeZeroBalanceAccounts', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Include zero-balance accounts
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formParams.includeInactiveAccounts}
              onChange={(e) => handleFormChange('includeInactiveAccounts', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Include inactive accounts
          </label>
        </div>
      </ReportFilterBar>

      {/* State-dependent content */}

      {/* IDLE / READY_TO_RUN — hero empty state */}
      {(pageState === 'IDLE' || pageState === 'READY_TO_RUN') && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-500">
            Select a chart and date, then click Run report.
          </p>
        </div>
      )}

      {/* LOADING — skeleton rows */}
      {pageState === 'LOADING' && <SkeletonRows />}

      {/* ERROR */}
      {pageState === 'ERROR' && (
        <ErrorSurface
          variant="retryable"
          title="Couldn't load trial balance"
          body="The report service didn't respond. Try again in a moment."
          onRetry={handleRetry}
        />
      )}

      {/* EMPTY */}
      {pageState === 'EMPTY' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-gray-700">
            No accounts found for this chart and period.
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Try widening the period, or toggle on "Include zero-balance accounts" to see accounts
            that exist but have no activity in the range.
          </p>
        </div>
      )}

      {/* SUCCESS */}
      {pageState === 'SUCCESS' && submittedResult && (
        <div className="space-y-3">
          <TrialBalanceTable result={submittedResult} />
          <div className="flex justify-end">
            <BalanceBadge result={submittedResult} />
          </div>
        </div>
      )}
    </div>
  )
}
