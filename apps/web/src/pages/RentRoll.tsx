import { useQuery } from '@tanstack/react-query'
import { getRentRoll, type RentRollRow } from '@/api/erpnext'

function StatusBadge({ status }: { status: RentRollRow['status'] }) {
  const styles = {
    Current: 'bg-green-100 text-green-800',
    Overdue: 'bg-red-100 text-red-800',
    Vacant:  'bg-muted text-muted-foreground',
  } as const
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function RentRoll() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'rent-roll'],
    queryFn: getRentRoll,
    staleTime: 5 * 60 * 1000,
  })

  const sorted = data
    ? [...data].sort((a, b) => {
        const order = { Overdue: 0, Current: 1, Vacant: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      })
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Rent Roll</h1>
        <p className="mt-1 text-sm text-muted-foreground">All properties × units — occupancy and payment status</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="text-sm text-red-600">
          Could not load rent roll: {(error as Error).message}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Tenant</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Lease Start</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Lease End</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Monthly Rent</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Last Payment</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Balance Due</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {sorted.map((row, i) => (
                <tr key={`${row.propertyId}-${row.unit ?? i}`} className="hover:bg-muted">
                  <td className="px-4 py-3 font-medium text-foreground">{row.propertyName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.unit ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground">{row.tenantName || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.leaseStart ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.leaseEnd ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-foreground">{fmt(row.monthlyRent)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.lastPaymentDate ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{fmt(row.balanceDue)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">No leases found.</p>
      )}
    </div>
  )
}
