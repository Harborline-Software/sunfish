/**
 * ProfitAndLossByPropertyPage — cohort-3 PR 3 full rewrite of PLReport.tsx
 *
 * Replaces the ERPNext direct-fetch flat P&L with a cartridge-backed
 * per-property accordion view. Run on demand via useProfitAndLossByProperty().
 *
 * @standing-pattern: pattern-013-cartridge-read-via-post
 * @candidate-pattern: pattern-015-provisional-report-surface
 * @candidate-pattern: pattern-016-run-on-demand-report
 * @candidate-pattern: pattern-017-csv-export-affordance
 */

import { useState, useId } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { CurrencyAmount } from '@sunfish/ui-react'
import { ChartSelector } from '@/components/ChartSelector'
import { ReportFilterBar } from '@/components/ReportFilterBar'
import { ExportCsvButton } from '@/components/ExportCsvButton'
import { ProvisionalityBanner } from '@/components/ProvisionalityBanner'
import { ErrorSurface } from '@/components/ErrorSurface'
import { useProfitAndLossByProperty } from '@/hooks/useReports'
import {
  exportProfitAndLossByPropertyCsv,
  type ProfitAndLossByPropertyParameters,
  type ProfitAndLossByPropertyResult,
  type ProfitAndLossByPropertyRow,
  type ChartId,
} from '@/api/reports'

// ---------------------------------------------------------------------------
// Page-local: DateRangePicker
// ---------------------------------------------------------------------------

interface DateRangePickerProps {
  periodStart: string | null
  periodEnd: string | null
  onChangePeriodStart: (v: string | null) => void
  onChangePeriodEnd: (v: string | null) => void
}

function DateRangePicker({ periodStart, periodEnd, onChangePeriodStart, onChangePeriodEnd }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500" htmlFor="period-start">
          Period start
        </label>
        <input
          id="period-start"
          type="date"
          value={periodStart ?? ''}
          onChange={(e) => onChangePeriodStart(e.target.value || null)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <span className="pb-2 text-xs text-gray-400">to</span>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500" htmlFor="period-end">
          Period end
        </label>
        <input
          id="period-end"
          type="date"
          value={periodEnd ?? ''}
          onChange={(e) => onChangePeriodEnd(e.target.value || null)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page-local: PropertyMultiSelect (simple text input placeholder)
// forward-watch: engineer-contract-frozen — property list endpoint
// ---------------------------------------------------------------------------

interface PropertyMultiSelectProps {
  value: string[] | null
  onChange: (v: string[] | null) => void
}

function PropertyMultiSelect({ value: _value, onChange: _onChange }: PropertyMultiSelectProps) {
  // forward-watch: replace with multi-select dropdown once property-list endpoint
  // is contract-frozen and PropertyMultiSelect is promoted to shared components.
  // For now renders a stub that passes "all properties" (null).
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">Properties</span>
      <p className="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
        All properties
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page-local: ToggleFilter
// ---------------------------------------------------------------------------

interface ToggleFilterProps {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleFilter({ id, label, checked, onChange }: ToggleFilterProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  )
}

// ---------------------------------------------------------------------------
// Page-local: PortfolioSummaryTiles
// ---------------------------------------------------------------------------

function formatPeriodRange(periodStart: string | null, periodEnd: string): string {
  const fmt = (iso: string) => {
    const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (!periodStart) return `Through ${fmt(periodEnd)}`
  return `${fmt(periodStart)} – ${fmt(periodEnd)}`
}

function netIncomeColorClass(value: number): string {
  if (value > 0) return 'text-green-700'
  if (value < 0) return 'text-red-700'
  return 'text-gray-700'
}

interface SummaryTileProps {
  label: string
  amount: number
  colorClass: string
  subtitle: string
}

function SummaryTile({ label, amount, colorClass, subtitle }: SummaryTileProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        <CurrencyAmount amount={amount} />
      </p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}

interface PortfolioSummaryTilesProps {
  result: ProfitAndLossByPropertyResult
}

function PortfolioSummaryTiles({ result }: PortfolioSummaryTilesProps) {
  const { totalRevenue, totalExpenses, netIncome } = result.totals
  const subtitle = formatPeriodRange(result.periodStart, result.periodEnd)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryTile label="Revenue" amount={totalRevenue} colorClass="text-green-700" subtitle={subtitle} />
      <SummaryTile label="Expenses" amount={totalExpenses} colorClass="text-red-700" subtitle={subtitle} />
      <SummaryTile
        label="Net Income"
        amount={netIncome}
        colorClass={netIncomeColorClass(netIncome)}
        subtitle={subtitle}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page-local: SkeletonAccordion + SkeletonTiles (loading state)
// ---------------------------------------------------------------------------

function SkeletonTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-7 w-28 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

function SkeletonAccordion() {
  return (
    <div className="space-y-0 overflow-hidden rounded-lg border border-gray-200">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-0">
          <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
          <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page-local: PropertyAccordion
// ---------------------------------------------------------------------------

interface PropertyAccordionProps {
  row: ProfitAndLossByPropertyRow
  initialOpen?: boolean
  isUnassigned?: boolean
}

function PropertyAccordion({ row, initialOpen = false, isUnassigned = false }: PropertyAccordionProps) {
  const [open, setOpen] = useState(initialOpen)
  const bodyId = useId()

  const headerBaseClass =
    'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-gray-50'
  const headerClass = open
    ? `${headerBaseClass} bg-gray-50 border-b-2 border-blue-500`
    : `${headerBaseClass} border-b border-gray-200`

  const chevron = open ? (
    <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
  ) : (
    <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
  )

  const nameClass = isUnassigned
    ? 'flex-1 text-base text-gray-500 italic'
    : 'flex-1 text-base font-medium text-gray-900'

  return (
    <div>
      <button
        type="button"
        className={headerClass}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        {chevron}
        <span className={nameClass}>{row.propertyKey}</span>
        <span className="w-24 text-right tabular-nums text-sm text-green-700">
          <CurrencyAmount amount={row.totalRevenue} />
        </span>
        <span className="w-24 text-right tabular-nums text-sm text-red-700">
          <CurrencyAmount amount={row.totalExpenses} />
        </span>
        <span className={`w-24 text-right tabular-nums text-sm ${netIncomeColorClass(row.netIncome)}`}>
          <CurrencyAmount amount={row.netIncome} />
        </span>
      </button>

      <div id={bodyId} role="region" aria-label={`${row.propertyKey} revenue and expenses`} hidden={!open}>
        <div className="bg-white px-4 py-3 border-b border-gray-200">
          {/* Revenue section */}
          {row.revenueLines.length > 0 && (
            <div className="mb-4">
              <p className="border-l-2 border-green-500 pl-2 text-sm font-medium text-gray-700 mb-2">Revenue</p>
              <div className="pl-4 space-y-0.5">
                {row.revenueLines.map((line) => (
                  <div key={line.accountId} className="flex items-center justify-between text-sm py-1">
                    <span>
                      <span className="text-gray-600 tabular-nums mr-3">{line.accountCode}</span>
                      <span className="text-gray-900">{line.accountName}</span>
                    </span>
                    <span className="tabular-nums text-green-700">
                      <CurrencyAmount amount={line.amount} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense section */}
          {row.expenseLines.length > 0 && (
            <div>
              <p className="border-l-2 border-red-500 pl-2 text-sm font-medium text-gray-700 mb-2">Expenses</p>
              <div className="pl-4 space-y-0.5">
                {row.expenseLines.map((line) => (
                  <div key={line.accountId} className="flex items-center justify-between text-sm py-1">
                    <span>
                      <span className="text-gray-600 tabular-nums mr-3">{line.accountCode}</span>
                      <span className="text-gray-900">{line.accountName}</span>
                    </span>
                    <span className="tabular-nums text-red-700">
                      <CurrencyAmount amount={line.amount} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {row.revenueLines.length === 0 && row.expenseLines.length === 0 && (
            <p className="text-sm text-gray-400 italic">No account lines for this property.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page-local: PropertyAccordionList
// Sorts: named properties alphabetically, "Unassigned" always last.
// Auto-expands single-property results.
// ---------------------------------------------------------------------------

interface PropertyAccordionListProps {
  rows: ProfitAndLossByPropertyRow[]
  autoExpandSingle: boolean
}

function PropertyAccordionList({ rows, autoExpandSingle }: PropertyAccordionListProps) {
  const sorted = [...rows].sort((a, b) => {
    const aIsUnassigned = a.propertyKey.toLowerCase() === 'unassigned'
    const bIsUnassigned = b.propertyKey.toLowerCase() === 'unassigned'
    if (aIsUnassigned && !bIsUnassigned) return 1
    if (!aIsUnassigned && bIsUnassigned) return -1
    return a.propertyKey.localeCompare(b.propertyKey)
  })

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {sorted.map((row) => {
        const isUnassigned = row.propertyKey.toLowerCase() === 'unassigned'
        const initialOpen = autoExpandSingle && rows.length === 1
        return (
          <PropertyAccordion
            key={row.propertyKey}
            row={row}
            initialOpen={initialOpen}
            isUnassigned={isUnassigned}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProfitAndLossByPropertyPage — top-level
// ---------------------------------------------------------------------------

interface FormState {
  chartId: ChartId | null
  periodStart: string | null
  periodEnd: string | null
  propertyIds: string[] | null
  includeZeroBalanceAccounts: boolean
}

export function ProfitAndLossByPropertyPage() {
  const mutation = useProfitAndLossByProperty()
  const toggleId = useId()

  const [form, setForm] = useState<FormState>({
    chartId: null,
    periodStart: null,
    periodEnd: null,
    propertyIds: null,
    includeZeroBalanceAccounts: false,
  })

  // Track what was actually submitted so Retry can reuse it.
  const [submittedParams, setSubmittedParams] = useState<ProfitAndLossByPropertyParameters | null>(null)

  const canRun = form.chartId !== null
  const isRunning = mutation.status === 'pending'

  function buildParams(): ProfitAndLossByPropertyParameters {
    return {
      chartId: form.chartId!,
      periodStart: form.periodStart ?? undefined,
      periodEnd: form.periodEnd ?? undefined,
      propertyIds: form.propertyIds ?? undefined,
      includeZeroBalanceAccounts: form.includeZeroBalanceAccounts,
    }
  }

  function handleRun() {
    if (!canRun || isRunning) return
    const params = buildParams()
    setSubmittedParams(params)
    mutation.mutate(params)
  }

  function handleRetry() {
    if (submittedParams) mutation.mutate(submittedParams)
  }

  function handleFormChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Changing any filter after a result clears the result (returns to IDLE).
    if (mutation.status === 'success' || mutation.status === 'error') {
      mutation.reset()
      setSubmittedParams(null)
    }
  }

  // Resolve the result from the envelope.
  const envelope = mutation.data
  const result = envelope?.result ?? null
  const isProvisional = envelope?.isProvisional ?? false
  const warnings = envelope?.warnings ?? []

  // CSV export — server supplies filename via Content-Disposition (pattern-017)
  async function handleExport() {
    if (!submittedParams) return
    await exportProfitAndLossByPropertyCsv(submittedParams)
  }

  const hasResult = mutation.status === 'success' && result !== null
  const isEmpty = hasResult && result.byProperty.length === 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profit &amp; Loss by Property</h1>
        <p className="mt-1 text-sm text-gray-500">Run on demand against any chart of accounts</p>
      </div>

      {/* Provisionality banner — pattern-015 */}
      {hasResult && (
        <ProvisionalityBanner isProvisional={isProvisional} warnings={warnings} />
      )}

      {/* Filter bar — pattern-016 */}
      <ReportFilterBar
        onRun={handleRun}
        canRun={canRun}
        isRunning={isRunning}
        exportButton={
          <ExportCsvButton
            enabled={hasResult && !isEmpty}
            onExport={handleExport}
          />
        }
      >
        <ChartSelector
          value={form.chartId}
          onChange={(v) => handleFormChange('chartId', v)}
          required
        />
        <DateRangePicker
          periodStart={form.periodStart}
          periodEnd={form.periodEnd}
          onChangePeriodStart={(v) => handleFormChange('periodStart', v)}
          onChangePeriodEnd={(v) => handleFormChange('periodEnd', v)}
        />
        <PropertyMultiSelect
          value={form.propertyIds}
          onChange={(v) => handleFormChange('propertyIds', v)}
        />
        <ToggleFilter
          id={toggleId}
          label="Include zero-balance accounts"
          checked={form.includeZeroBalanceAccounts}
          onChange={(v) => handleFormChange('includeZeroBalanceAccounts', v)}
        />
      </ReportFilterBar>

      {/* LOADING state */}
      {isRunning && (
        <div className="space-y-4">
          <SkeletonTiles />
          <SkeletonAccordion />
        </div>
      )}

      {/* ERROR state — pattern-015 hides banner when error owns the screen */}
      {mutation.status === 'error' && (
        <ErrorSurface
          variant="retryable"
          title="Couldn't run profit & loss report"
          body="The report service didn't respond. Try again in a moment."
          onRetry={handleRetry}
        />
      )}

      {/* EMPTY state */}
      {hasResult && isEmpty && (
        <div className="py-12 text-center">
          <p className="text-gray-500">No activity in this period and chart.</p>
          <p className="mt-1 text-sm text-gray-400">Adjust the filters above and run again.</p>
        </div>
      )}

      {/* SUCCESS state */}
      {hasResult && !isEmpty && (
        <div className="space-y-4">
          <PortfolioSummaryTiles result={result} />
          <PropertyAccordionList rows={result.byProperty} autoExpandSingle={true} />
        </div>
      )}
    </div>
  )
}
