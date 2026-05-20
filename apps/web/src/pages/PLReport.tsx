import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProperties, getProfitLoss, exportProfitLoss } from '@/api/erpnext'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function PLReport() {
  const [propertyId, setPropertyId] = useState<string>('')
  const [period, setPeriod] = useState<string>('year')
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().slice(0, 10))
  const [exporting, setExporting] = useState(false)

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
    staleTime: 10 * 60 * 1000,
  })

  const plQuery = useQuery({
    queryKey: ['reports', 'profit-loss', propertyId, period, asOf],
    queryFn: () => getProfitLoss(propertyId || undefined, period, asOf),
    staleTime: 5 * 60 * 1000,
  })

  async function handleExport() {
    setExporting(true)
    try {
      await exportProfitLoss(propertyId || undefined, period, asOf)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Profit &amp; Loss</h1>
          <p className="mt-1 text-sm text-muted-foreground">Income and expenses from ERPNext General Ledger</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || plQuery.isLoading}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pl-property" className="text-xs font-medium text-muted-foreground">Property</label>
          <select
            id="pl-property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="rounded border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All properties</option>
            {propertiesQuery.data?.map((p) => (
              <option key={p.name} value={p.name}>{p.property_name || p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pl-period" className="text-xs font-medium text-muted-foreground">Period</label>
          <select
            id="pl-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="month">Month to date</option>
            <option value="quarter">Quarter to date</option>
            <option value="year">Year to date</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pl-asof" className="text-xs font-medium text-muted-foreground">As of</label>
          <input
            id="pl-asof"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {plQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {plQuery.isError && (
        <p className="text-sm text-red-600">
          Could not load P&amp;L report: {(plQuery.error as Error).message}
        </p>
      )}

      {plQuery.data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">Total Income</p>
              <p className="mt-1 text-xl font-semibold text-green-700">{fmt(plQuery.data.income)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
              <p className="mt-1 text-xl font-semibold text-red-700 dark:text-red-400">{fmt(plQuery.data.expenses)}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">Net Income</p>
              <p className={`mt-1 text-xl font-semibold ${plQuery.data.net >= 0 ? 'text-foreground' : 'text-red-700 dark:text-red-400'}`}>
                {fmt(plQuery.data.net)}
              </p>
            </div>
          </div>

          {/* Income lines */}
          {plQuery.data.incomeLines.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Income</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border text-sm">
                  <tbody className="bg-background divide-y divide-border">
                    {plQuery.data.incomeLines.map((line) => (
                      <tr key={line.account}>
                        <td className="px-4 py-2 text-foreground">{line.account}</td>
                        <td className="px-4 py-2 text-right font-medium text-green-700">{fmt(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense lines */}
          {plQuery.data.expenseLines.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Expenses</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border text-sm">
                  <tbody className="bg-background divide-y divide-border">
                    {plQuery.data.expenseLines.map((line) => (
                      <tr key={line.account}>
                        <td className="px-4 py-2 text-foreground">{line.account}</td>
                        <td className="px-4 py-2 text-right font-medium text-red-700 dark:text-red-400">{fmt(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
