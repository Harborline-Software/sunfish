import { ErrorCard, LoadingState } from '@sunfish/ui-react'
import { Link } from 'react-router-dom'
import { useLeases } from '@/hooks/useLeases'
import { Badge } from '@/components/ui/badge'
import type { LeaseSummary } from '@/api/leases'   // rebound from @/api/erpnext — W#74 PR 2

function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
}

function LeaseStatusBadge({ status }: { status: LeaseSummary['status'] }) {
  const variant = status === 'Active' ? ('success' as const) : status === 'Expired' ? ('outline' as const) : ('secondary' as const)
  return <Badge variant={variant}>{status}</Badge>
}

export function LeasesPage() {
  const { data: leases, isPending, isError, error, refetch } = useLeases()

  if (isPending) return <LoadingState label="Loading leases…" />

  if (isError) {
    return (
      <ErrorCard
        title="Failed to load leases"
        message={error.message}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!leases?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No leases found. Add a lease in the cockpit to get started.
      </div>
    )
  }

  const now = Date.now()
  const expiringLeases = leases.filter(
    (l) => l.status === 'Active' && new Date(l.endDate).getTime() - now < 60 * 86_400_000,
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
        <p className="text-gray-500">{leases.length} leases</p>
      </div>

      {expiringLeases.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">
            {expiringLeases.length} lease{expiringLeases.length > 1 ? 's' : ''} expiring within 60 days
          </p>
          <ul className="mt-1 list-disc ps-5 text-sm text-amber-700">
            {expiringLeases.map((l) => (
              <li key={l.leaseId}>
                {l.tenantDisplayName} — {l.propertyDisplayName ?? l.propertyId ?? '—'} ({daysUntilExpiry(l.endDate)} days)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Property / Unit</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Start</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">End</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Monthly Rent</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {leases.map((l) => {
              const days = daysUntilExpiry(l.endDate)
              const expiringSoon = l.status === 'Active' && days < 60
              return (
                <tr key={l.leaseId} className={expiringSoon ? 'bg-amber-50' : undefined}>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.tenantDisplayName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {l.propertyDisplayName ?? l.propertyId ?? '—'}
                    {l.unitId ? ` · ${l.unitId}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.startDate}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {l.endDate}
                    {expiringSoon && (
                      <Badge variant="warning" className="ms-2 text-xs">
                        {days}d
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${l.monthlyRent.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <LeaseStatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/leases/${l.leaseId}`}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
