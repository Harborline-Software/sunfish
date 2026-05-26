import { useEffect } from 'react'
import { useCharts } from '@/hooks/useReports'
import type { ChartId } from '@/api/reports'

export interface ChartSelectorProps {
  value: ChartId | null
  onChange: (chartId: ChartId | null) => void
  required?: boolean
}

export function ChartSelector({ value, onChange, required = true }: ChartSelectorProps) {
  const { data, isPending, isError } = useCharts()
  const charts = data?.charts ?? []

  // Auto-select when exactly 1 chart — Q2 canonical behavior
  useEffect(() => {
    if (charts.length === 1 && value === null) {
      onChange(charts[0]!.chartId)
    }
  }, [charts, value, onChange])

  if (isPending) {
    return <div className="h-9 w-48 rounded bg-gray-100 animate-pulse" aria-label="Loading charts…" />
  }

  if (isError) {
    return <p className="text-sm text-red-600">Couldn't load charts</p>
  }

  if (charts.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Set up a chart of accounts before running reports.{' '}
        {/* forward-watch: engineer-contract-frozen — /settings/chart-of-accounts route reserved */}
      </p>
    )
  }

  if (charts.length === 1) {
    return (
      <p className="text-sm text-gray-700">
        Chart: <span className="font-medium">{charts[0]!.name}</span>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500" htmlFor="chart-selector">
        Chart of accounts
      </label>
      <select
        id="chart-selector"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        required={required}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Select a chart…</option>
        {charts.map((c) => (
          <option key={c.chartId} value={c.chartId}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
