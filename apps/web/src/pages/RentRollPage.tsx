/**
 * RentRollPage — cohort-3 PR 2
 *
 * Replaces RentRoll.tsx (ERPNext-direct). Backed by the RentRoll cartridge via
 * POST /api/v1/reports/rent-roll through the shared infrastructure from PR 1.
 *
 * Pattern alignment:
 *   @standing-pattern: pattern-013-cartridge-read-via-post
 *   @candidate-pattern: pattern-015-provisional-report-surface
 *   @candidate-pattern: pattern-016-run-on-demand-report
 *   @candidate-pattern: pattern-017-csv-export-affordance
 */

import { useState } from 'react'
import { useRentRoll } from '@/hooks/useReports'
import { exportRentRollCsv } from '@/api/reports'
import type {
  RentRollParameters,
  RentRollPropertyBlock,
  RentRollUnitRow,
  RentRollPortfolioSummary,
  OccupancyStatus,
  ArAgingBucket,
  VacancyReason,
} from '@/api/reports'
import { ProvisionalityBanner } from '@/components/ProvisionalityBanner'
import { ExportCsvButton } from '@/components/ExportCsvButton'
import { ReportFilterBar } from '@/components/ReportFilterBar'
import { ChartSelector } from '@/components/ChartSelector'
import { ErrorSurface } from '@/components/ErrorSurface'
import { CurrencyAmount } from '@sunfish/ui-react'

// TODO: use StatusPill from @sunfish/ui-react after shipyard#138 merges.
// For now, OccupancyStatus and ArAgingBucket rendering is inlined below.

// -------------------------------------------------------------------------
// Inline badge helpers (pending StatusPill promotion from shipyard#138)
// -------------------------------------------------------------------------

const OCCUPANCY_STATUS_CLASSES: Record<OccupancyStatus, string> = {
  Occupied: 'bg-green-100 text-green-700',
  NoticeGiven: 'bg-amber-100 text-amber-800',
  Vacant: 'bg-gray-100 text-gray-700',
  OffMarket: 'bg-gray-100 text-gray-600 border border-gray-300',
}

const OCCUPANCY_STATUS_LABELS: Record<OccupancyStatus, string> = {
  Occupied: 'Occupied',
  NoticeGiven: 'Notice Given',
  Vacant: 'Vacant',
  OffMarket: 'Off Market',
}

const AGING_BUCKET_CLASSES: Partial<Record<ArAgingBucket, string>> = {
  Current: 'bg-gray-100 text-gray-700',
  Days0To30: 'bg-amber-50 text-amber-900',
  Days31To60: 'bg-amber-100 text-amber-900',
  Days61To90: 'bg-orange-100 text-orange-900',
  Days90Plus: 'bg-red-100 text-red-900',
}

const AGING_BUCKET_LABELS: Partial<Record<ArAgingBucket, string>> = {
  Current: 'Current',
  Days0To30: '0–30',
  Days31To60: '31–60',
  Days61To90: '61–90',
  Days90Plus: '90+',
}

interface OccupancyBadgeProps {
  status: OccupancyStatus
  vacancyReason: VacancyReason | null
}

function OccupancyBadge({ status, vacancyReason }: OccupancyBadgeProps) {
  const classes = OCCUPANCY_STATUS_CLASSES[status]
  const label = OCCUPANCY_STATUS_LABELS[status]
  // NoticeGiven: tooltip via title attribute
  const titleAttr = status === 'NoticeGiven' && vacancyReason ? vacancyReason : undefined

  return (
    <div>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
        title={titleAttr}
      >
        {label}
      </span>
      {/* Vacant: inline sub-label below the badge */}
      {status === 'Vacant' && vacancyReason && (
        <div className="text-xs text-gray-500">{vacancyReason}</div>
      )}
    </div>
  )
}

function AgingBucketCell({ bucket }: { bucket: ArAgingBucket }) {
  // NoBalance renders as em-dash with no pill
  if (bucket === 'NoBalance') {
    return <span className="text-gray-400">&mdash;</span>
  }
  const classes = AGING_BUCKET_CLASSES[bucket]
  const label = AGING_BUCKET_LABELS[bucket]
  if (!classes || !label) return <span className="text-gray-400">&mdash;</span>
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

// -------------------------------------------------------------------------
// PortfolioSummaryBar
// -------------------------------------------------------------------------

function PortfolioSummaryBar({ portfolio }: { portfolio: RentRollPortfolioSummary }) {
  const occupancyPercent = Math.round(portfolio.occupancyRate * 100)

  const tiles = [
    {
      label: 'Occupancy',
      value: <span className="text-3xl font-semibold text-gray-900 tabular-nums">{occupancyPercent}%</span>,
      sub: 'occupancy rate',
    },
    {
      label: 'Properties',
      value: <span className="text-2xl font-semibold text-gray-900 tabular-nums">{portfolio.propertiesCovered}</span>,
      sub: 'properties covered',
    },
    {
      label: 'Units',
      value: <span className="text-2xl font-semibold text-gray-900 tabular-nums">{portfolio.totalUnits}</span>,
      sub: 'units surveyed',
    },
    {
      label: 'Monthly Rent',
      value: (
        <span className="text-2xl font-semibold text-gray-900 tabular-nums">
          <CurrencyAmount amount={portfolio.monthlyRentTotal} />
        </span>
      ),
      sub: 'across all units',
    },
    {
      label: 'Open Balance',
      value: (
        <span className="text-2xl font-semibold text-gray-900 tabular-nums">
          <CurrencyAmount amount={portfolio.openBalanceTotal} />
        </span>
      ),
      sub: 'across all properties',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {tiles.map(({ label, value, sub }) => (
        <div
          key={label}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2"
        >
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-1">{value}</div>
          <div className="text-xs text-gray-500">{sub}</div>
        </div>
      ))}
    </div>
  )
}

// -------------------------------------------------------------------------
// PropertyHeader
// -------------------------------------------------------------------------

function PropertyHeader({ block }: { block: RentRollPropertyBlock }) {
  const { propertyName, propertyKey, summary } = block
  const name = propertyName || propertyKey
  const occupancyPercent = Math.round(summary.occupancyRate * 100)

  const statsAriaLabel = [
    `${summary.totalUnits} units`,
    `${summary.occupiedUnits} occupied`,
    `${occupancyPercent} percent`,
    // aria-label format for money values: spelled out by screen reader from CurrencyAmount
  ].join(', ')

  return (
    <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-3">
      <span className="text-base font-semibold text-gray-900">{name}</span>
      {summary.totalUnits > 0 && (
        <span
          className="text-sm text-gray-600"
          aria-label={statsAriaLabel}
        >
          {summary.totalUnits} units
          {' | '}
          {summary.occupiedUnits} occupied ({occupancyPercent}%)
          {' | '}
          <CurrencyAmount amount={summary.monthlyRentTotal} />/mo
          {' | '}
          <CurrencyAmount amount={summary.openBalanceTotal} /> open
        </span>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// UnitTable
// -------------------------------------------------------------------------

function UnitTable({ units, propertyName, expiringWindowDays }: {
  units: RentRollUnitRow[]
  propertyName: string
  expiringWindowDays: number
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table
        className="min-w-full divide-y divide-gray-200 text-sm"
        aria-label={`Rent roll for ${propertyName}`}
      >
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Unit
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Tenant
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Lease End
            </th>
            <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
              Monthly Rent
            </th>
            <th scope="col" className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
              Open Bal.
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Delinquency
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {units.map((row, idx) => (
            <tr key={`${row.unitLabel}-${idx}`} className="hover:bg-gray-50">
              {/* Unit */}
              <td className="px-3 py-2 font-mono text-sm text-gray-900">{row.unitLabel}</td>
              {/* Tenant */}
              <td className="px-3 py-2 text-sm">
                {row.tenantName
                  ? <span className="text-gray-900">{row.tenantName}</span>
                  : <span className="text-gray-400">(vacant)</span>
                }
              </td>
              {/* Lease End */}
              <td className="px-3 py-2 text-sm text-gray-600">
                {row.leaseEnd ? (
                  <span className="inline-flex items-center gap-1.5">
                    {row.leaseEnd}
                    {row.expiringSoon && (
                      <span
                        className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        aria-label={`Expiring within ${expiringWindowDays} days`}
                      >
                        Expiring
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">&mdash;</span>
                )}
              </td>
              {/* Monthly Rent */}
              <td className="px-3 py-2 text-right tabular-nums text-sm text-gray-900">
                <CurrencyAmount amount={row.monthlyRent} />
              </td>
              {/* Open Balance */}
              <td className="px-3 py-2 text-right tabular-nums text-sm">
                {row.openBalance === 0
                  ? <span className="text-gray-400">&mdash;</span>
                  : <span className="text-gray-900"><CurrencyAmount amount={row.openBalance} /></span>
                }
              </td>
              {/* Delinquency */}
              <td className="px-3 py-2">
                <AgingBucketCell bucket={row.delinquencyBucket} />
              </td>
              {/* Status */}
              <td className="px-3 py-2">
                <OccupancyBadge status={row.status} vacancyReason={row.vacancyReason} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// -------------------------------------------------------------------------
// PropertyBlock
// -------------------------------------------------------------------------

function PropertyBlock({ block, expiringWindowDays }: {
  block: RentRollPropertyBlock
  expiringWindowDays: number
}) {
  const name = block.propertyName || block.propertyKey
  return (
    <div className="mt-6">
      <PropertyHeader block={block} />
      <UnitTable
        units={block.units}
        propertyName={name}
        expiringWindowDays={expiringWindowDays}
      />
    </div>
  )
}

// -------------------------------------------------------------------------
// SkeletonRows (loading state)
// -------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white px-4 py-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-gray-100 animate-pulse h-8 my-1 rounded" />
      ))}
    </div>
  )
}

// -------------------------------------------------------------------------
// RentRollPage
// -------------------------------------------------------------------------

interface FormParams {
  chartId: string | null
  asOfDate: string
  expiringWindowDays: number
  includeVacant: boolean
}

const today = new Date().toISOString().slice(0, 10)

function buildDefaultFormParams(): FormParams {
  return {
    chartId: null,
    asOfDate: today,
    expiringWindowDays: 90,
    includeVacant: true,
  }
}

export function RentRollPage() {
  const [formParams, setFormParams] = useState<FormParams>(buildDefaultFormParams)
  const [submittedParams, setSubmittedParams] = useState<RentRollParameters | null>(null)

  const mutation = useRentRoll()

  // pattern-016: canRun requires chartId
  const canRun = formParams.chartId !== null && !mutation.isPending

  function handleRun() {
    if (!formParams.chartId) return
    const params: RentRollParameters = {
      chartId: formParams.chartId,
      asOfDate: formParams.asOfDate || null,
      expiringWindowDays: formParams.expiringWindowDays,
      includeVacant: formParams.includeVacant,
    }
    setSubmittedParams(params)
    mutation.mutate(params)
  }

  function handleRetry() {
    if (submittedParams) mutation.mutate(submittedParams)
  }

  // pattern-016 invariant 3: any filter change resets to IDLE
  function updateFormParams(updates: Partial<FormParams>) {
    setFormParams((prev) => ({ ...prev, ...updates }))
    mutation.reset()
    setSubmittedParams(null)
  }

  const resultData = mutation.isSuccess ? mutation.data : null

  // CSV export — server supplies filename via Content-Disposition (pattern-017)
  async function handleExport() {
    if (!submittedParams) return
    await exportRentRollCsv(submittedParams)
  }

  const exportButton = (
    <ExportCsvButton
      enabled={mutation.isSuccess}
      onExport={handleExport}
    />
  )

  // Sort properties by name ascending (case-insensitive)
  const sortedProperties = resultData?.result?.properties
    ? [...resultData.result.properties].sort((a, b) =>
        (a.propertyName || a.propertyKey).toLowerCase().localeCompare(
          (b.propertyName || b.propertyKey).toLowerCase()
        )
      )
    : []

  const isEmpty = mutation.isSuccess && sortedProperties.length === 0

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rent Roll</h1>
        <p className="mt-1 text-sm text-gray-500">Run on demand against any chart of accounts</p>
      </div>

      {/* Provisionality Banner — pattern-015 */}
      {mutation.isSuccess && (
        <ProvisionalityBanner
          isProvisional={mutation.data.isProvisional}
          warnings={mutation.data.warnings}
        />
      )}

      {/* Filter Bar — pattern-016 */}
      <ReportFilterBar
        onRun={handleRun}
        canRun={canRun}
        isRunning={mutation.isPending}
        exportButton={exportButton}
      >
        {/* Chart of Accounts */}
        <ChartSelector
          value={formParams.chartId}
          onChange={(id) => updateFormParams({ chartId: id })}
          required
        />

        {/* As of date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700" htmlFor="rent-roll-as-of">
            As of
          </label>
          <input
            id="rent-roll-as-of"
            type="date"
            value={formParams.asOfDate}
            onChange={(e) => updateFormParams({ asOfDate: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Expiring window */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700" htmlFor="rent-roll-expiring-days">
            Flag leases expiring within
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="rent-roll-expiring-days"
              type="number"
              min={1}
              max={730}
              value={formParams.expiringWindowDays}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1 && v <= 730) updateFormParams({ expiringWindowDays: v })
              }}
              className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
        </div>

        {/* Include vacant */}
        <div className="flex items-center gap-2">
          <input
            id="rent-roll-include-vacant"
            type="checkbox"
            checked={formParams.includeVacant}
            onChange={(e) => updateFormParams({ includeVacant: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="rent-roll-include-vacant" className="text-sm text-gray-700">
            Include vacant units
          </label>
        </div>
      </ReportFilterBar>

      {/* Result panel */}
      {mutation.isPending && <SkeletonRows />}

      {mutation.isError && (
        <ErrorSurface
          variant="retryable"
          title="Couldn't load the rent roll"
          body="The report service didn't respond. Try again in a moment."
          onRetry={handleRetry}
        />
      )}

      {isEmpty && (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No units found for this chart and date.</p>
          <p className="mt-1 text-sm text-gray-500">Try widening the as-of date or selecting another chart.</p>
        </div>
      )}

      {mutation.isSuccess && !isEmpty && (
        <>
          {/* Portfolio Summary Bar — pattern-016 §SUCCESS */}
          <PortfolioSummaryBar portfolio={resultData!.result.portfolio} />

          {/* Property blocks */}
          {sortedProperties.map((block) => (
            <PropertyBlock
              key={block.propertyKey}
              block={block}
              expiringWindowDays={formParams.expiringWindowDays}
            />
          ))}
        </>
      )}

      {/* Hidden / deferred cohort-3 fields — not rendered: */}
      {/* TODO(cohort-4 or later): surface lastPaymentDate column when cartridge populates it. */}
      {/* TODO(cohort-4 or later): surface prepaidBalance once cartridge supports it. */}
      {/* TODO(cohort-4 or later): surface projectedNextMonthRent column once cartridge computes it independently. */}
    </div>
  )
}
