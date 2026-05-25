/**
 * ArAgingPage — cohort-3 PR 5
 *
 * Run-on-demand AR aging report. Surfaces open receivables by customer and
 * by property as of a chosen date, plus a top-N delinquent customers list.
 *
 * Patterns exercised:
 *   @standing-pattern: pattern-013-cartridge-read-via-post
 *   @candidate-pattern: pattern-015-provisional-report-surface
 *   @candidate-pattern: pattern-016-run-on-demand-report
 *   @candidate-pattern: pattern-017-csv-export-affordance
 */

import { useState } from 'react'
import { CurrencyAmount } from '@sunfish/ui-react'
import { ProvisionalityBanner } from '@/components/ProvisionalityBanner'
import { ExportCsvButton } from '@/components/ExportCsvButton'
import { ReportFilterBar } from '@/components/ReportFilterBar'
import { ChartSelector } from '@/components/ChartSelector'
import { ErrorSurface } from '@/components/ErrorSurface'
import { useArAgingSummary } from '@/hooks/useReports'
import {
  exportArAgingSummaryCsv,
  type ArAgingSummaryParameters,
  type ArAgingSummaryResult,
  type ArAgingSummaryRow,
  type TopDelinquentCustomer,
  type ChartId,
} from '@/api/reports'

// ---------------------------------------------------------------------------
// Page-local sub-components
// ---------------------------------------------------------------------------

interface ArAgingTotalsBarProps {
  totals: ArAgingSummaryRow
}

function ArAgingTotalsBar({ totals }: ArAgingTotalsBarProps) {
  const tiles = [
    { label: 'Current', value: totals.current },
    { label: '0–30 d', value: totals.days0To30 },
    { label: '31–60 d', value: totals.days31To60 },
    { label: '61–90 d', value: totals.days61To90 },
    { label: '90+ d', value: totals.days90Plus },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2"
        >
          <p className="text-xs uppercase tracking-wide text-gray-500">{tile.label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            <CurrencyAmount amount={tile.value} />
          </p>
        </div>
      ))}
      {/* Total tile — blue left border separates it from the bucket tiles */}
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 border-l-4 border-l-blue-500">
        <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
          <CurrencyAmount amount={totals.totalOpen} />
        </p>
      </div>
    </div>
  )
}

// Aging bucket header config — canonical tints per design direction Q-A
const COLUMN_HEADERS: Array<{
  key: keyof ArAgingSummaryRow
  label: string
  bg: string
  text: string
}> = [
  { key: 'current',    label: 'Current', bg: 'bg-gray-50',   text: 'text-gray-700' },
  { key: 'days0To30',  label: '0–30 d',  bg: 'bg-gray-50',   text: 'text-gray-700' },
  { key: 'days31To60', label: '31–60 d', bg: 'bg-amber-50',  text: 'text-amber-900' },
  { key: 'days61To90', label: '61–90 d', bg: 'bg-orange-50', text: 'text-orange-900' },
  { key: 'days90Plus', label: '90+ d',   bg: 'bg-red-50',    text: 'text-red-900' },
  { key: 'totalOpen',  label: 'Total',   bg: 'bg-gray-50',   text: 'text-gray-700' },
]

interface AgingTableProps {
  rows: ArAgingSummaryRow[]
  totals: ArAgingSummaryRow
  nameLabel: string
}

function AgingTable({ rows, totals, nameLabel }: AgingTableProps) {
  function renderCell(value: number, isBold = false) {
    if (value === 0) {
      return (
        <td className="px-4 py-2 text-right tabular-nums text-gray-400">
          <span aria-label="zero">—</span>
        </td>
      )
    }
    return (
      <td className={`px-4 py-2 text-right tabular-nums text-gray-900${isBold ? ' font-semibold' : ''}`}>
        <CurrencyAmount amount={value} />
      </td>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-700">
              {nameLabel}
            </th>
            {COLUMN_HEADERS.map((col) => (
              <th
                key={col.key}
                className={`${col.bg} ${col.text} px-4 py-3 text-right text-xs font-medium uppercase tracking-wide`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.groupKey} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm text-gray-900">{row.groupLabel}</td>
              {renderCell(row.current)}
              {renderCell(row.days0To30)}
              {renderCell(row.days31To60)}
              {renderCell(row.days61To90)}
              {renderCell(row.days90Plus)}
              {renderCell(row.totalOpen)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50">
            <td className="px-4 py-2 text-sm font-semibold text-gray-900">TOTAL</td>
            {COLUMN_HEADERS.map((col) => {
              const value = totals[col.key] as number
              return (
                <td
                  key={col.key}
                  className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-gray-900"
                >
                  {value === 0 ? <span className="text-gray-400">—</span> : <CurrencyAmount amount={value} />}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

interface TopDelinquentListProps {
  customers: TopDelinquentCustomer[]
  topN: number
}

function TopDelinquentList({ customers, topN }: TopDelinquentListProps) {
  if (customers.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Top {topN} delinquent customers
        </h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {customers.map((customer, idx) => (
          <li key={customer.customerId} className="flex items-center gap-3 px-4 py-3">
            {/* Rank chip — decorative */}
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
              aria-hidden="true"
            >
              {idx + 1}
            </span>
            {/* Customer name */}
            <span className="flex-1 text-sm font-medium text-gray-900">{customer.customerName}</span>
            {/* 90+ balance */}
            <span className="text-sm tabular-nums">
              {customer.days90PlusBalance > 0 ? (
                <span>
                  <span className="text-xs text-gray-500 mr-1">90+:</span>
                  <span className="font-medium text-red-700">
                    <CurrencyAmount amount={customer.days90PlusBalance} />
                  </span>
                </span>
              ) : (
                <span>
                  <span className="text-xs text-gray-500 mr-1">90+:</span>
                  <span className="text-gray-400">—</span>
                </span>
              )}
            </span>
            {/* Total open balance */}
            <span className="text-sm tabular-nums text-gray-700">
              <span className="text-xs text-gray-500 mr-1">Total:</span>
              <CurrencyAmount amount={customer.totalOpenBalance} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface SkeletonRowsProps {
  count?: number
}

function SkeletonRows({ count = 5 }: SkeletonRowsProps) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
      ))}
    </div>
  )
}

function SkeletonTotalsBar() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// State machine types — pattern-016
// ---------------------------------------------------------------------------

type ReportState =
  | { phase: 'IDLE' }
  | { phase: 'READY_TO_RUN' }
  | { phase: 'LOADING' }
  | { phase: 'SUCCESS'; result: ArAgingSummaryResult; submittedParams: ArAgingSummaryParameters }
  | { phase: 'ERROR'; submittedParams: ArAgingSummaryParameters }

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function ArAgingPage() {
  const [chartId, setChartId] = useState<ChartId | null>(null)
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [topDelinquentN, setTopDelinquentN] = useState(10)

  const mutation = useArAgingSummary()

  // Derive state — pattern-016 IDLE → READY_TO_RUN → LOADING → SUCCESS/ERROR
  const state: ReportState = (() => {
    if (mutation.isPending) return { phase: 'LOADING' }
    if (mutation.isError) {
      return {
        phase: 'ERROR',
        submittedParams: mutation.variables as ArAgingSummaryParameters,
      }
    }
    if (mutation.isSuccess && mutation.data) {
      return {
        phase: 'SUCCESS',
        result: mutation.data.result,
        submittedParams: mutation.variables as ArAgingSummaryParameters,
      }
    }
    if (chartId !== null) return { phase: 'READY_TO_RUN' }
    return { phase: 'IDLE' }
  })()

  const canRun = chartId !== null && state.phase !== 'LOADING'
  const isRunning = state.phase === 'LOADING'
  const hasResult = state.phase === 'SUCCESS'

  function handleRun() {
    if (!chartId) return
    const params: ArAgingSummaryParameters = {
      chartId,
      asOfDate: asOfDate || null,
      topDelinquentN,
    }
    mutation.mutate(params)
  }

  function handleFilterChange() {
    // Any filter change after SUCCESS resets to IDLE — reset the mutation
    mutation.reset()
  }

  // CSV export — server supplies filename via Content-Disposition (pattern-017)
  async function handleExport(): Promise<void> {
    if (state.phase !== 'SUCCESS') return
    const { submittedParams } = state
    await exportArAgingSummaryCsv(submittedParams)
  }

  const exportButton = (
    <ExportCsvButton
      enabled={hasResult}
      onExport={handleExport}
    />
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AR Aging</h1>
        <p className="mt-1 text-sm text-gray-500">
          Open receivables by customer and by property as of a chosen date
        </p>
      </div>

      {/* Provisionality banner — pattern-015; sits above filter bar */}
      {state.phase === 'SUCCESS' && (
        <ProvisionalityBanner
          isProvisional={mutation.data?.isProvisional ?? false}
          warnings={mutation.data?.warnings ?? []}
        />
      )}

      {/* Filter bar — pattern-016 */}
      <ReportFilterBar
        onRun={handleRun}
        canRun={canRun}
        isRunning={isRunning}
        exportButton={exportButton}
      >
        {/* Chart selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">
            Chart <span aria-label="required">*</span>
          </label>
          <ChartSelector
            value={chartId}
            onChange={(id) => {
              setChartId(id)
              handleFilterChange()
            }}
            required
          />
        </div>

        {/* As-of date */}
        <div className="flex flex-col gap-1">
          <label htmlFor="ar-as-of-date" className="text-xs font-medium text-gray-700">
            As of
          </label>
          <input
            id="ar-as-of-date"
            type="date"
            value={asOfDate}
            onChange={(e) => {
              setAsOfDate(e.target.value)
              handleFilterChange()
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Top-N delinquent stepper */}
        <div className="flex flex-col gap-1">
          <label htmlFor="ar-top-n" className="text-xs font-medium text-gray-700">
            Top delinquent
          </label>
          <div className="flex items-center gap-1">
            <input
              id="ar-top-n"
              type="number"
              min={0}
              max={100}
              value={topDelinquentN}
              onChange={(e) => {
                const n = Math.max(0, Math.min(100, Number(e.target.value)))
                setTopDelinquentN(n)
                handleFilterChange()
              }}
              className="w-20 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">customers</span>
          </div>
        </div>
      </ReportFilterBar>

      {/* Loading state */}
      {state.phase === 'LOADING' && (
        <div className="space-y-6" aria-busy="true" aria-label="Loading AR aging report">
          <SkeletonTotalsBar />
          <div className="space-y-3">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
            <SkeletonRows />
          </div>
          <div className="space-y-3">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
            <SkeletonRows />
          </div>
        </div>
      )}

      {/* Error state */}
      {state.phase === 'ERROR' && (
        <ErrorSurface
          variant="retryable"
          title="Couldn't run the AR aging report"
          body="The report service didn't respond. Try again in a moment."
          onRetry={() => mutation.mutate(state.submittedParams)}
        />
      )}

      {/* Success state */}
      {state.phase === 'SUCCESS' && (() => {
        const { result } = state
        const isEmpty = result.totals.totalOpen === 0

        if (isEmpty) {
          return (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <h2 className="text-base font-medium text-gray-900">No outstanding receivables.</h2>
              <p className="mt-1 text-sm text-gray-600">
                All customers are current as of {result.asOf.slice(0, 10)}.
              </p>
            </div>
          )
        }

        return (
          <div className="space-y-6">
            {/* Portfolio totals bar */}
            <ArAgingTotalsBar totals={result.totals} />

            {/* By Customer section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">By Customer</h2>
              <AgingTable
                rows={result.byCustomer}
                totals={result.totals}
                nameLabel="Customer"
              />
            </section>

            {/* By Property section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">By Property</h2>
              <AgingTable
                rows={result.byProperty}
                totals={result.totals}
                nameLabel="Property"
              />
            </section>

            {/* Top delinquent customers — hidden when topDelinquentN is 0 or no results */}
            {topDelinquentN > 0 && result.topDelinquent.length > 0 && (
              <TopDelinquentList
                customers={result.topDelinquent}
                topN={topDelinquentN}
              />
            )}
          </div>
        )
      })()}
    </div>
  )
}
