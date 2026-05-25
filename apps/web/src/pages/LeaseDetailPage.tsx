import { ErrorCard, LoadingState } from '@sunfish/ui-react'
import { useParams, Link } from 'react-router-dom'
import { useLease, useLeasePayments } from '@/hooks/useLeases'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LeaseDetailPage() {
  const { name } = useParams<{ name: string }>()
  const { data: lease, isPending: leasePending, isError: leaseError, error: leaseErr } = useLease(name ?? '')
  const {
    data: paymentsData,
    isPending: paymentsPending,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useLeasePayments(name ?? '')

  if (leasePending) return <LoadingState label="Loading lease…" />

  if (leaseError) {
    return (
      <div>
        <ErrorCard title="Failed to load lease" message={leaseErr.message} />
        <Link to="/leases" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          ← Back to leases
        </Link>
      </div>
    )
  }

  if (!lease) return null

  const payments = paymentsData?.items ?? []
  const recordPaymentHref = `/rent?lease=${encodeURIComponent(lease.leaseId)}`

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/leases" className="text-sm text-blue-600 hover:underline">
          ← Leases
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{lease.tenantDisplayName}</h1>
        <Badge variant={lease.status === 'Active' ? 'success' : 'outline'}>{lease.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Lease Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2 sm:gap-x-6">
            <div>
              <dt className="text-gray-500">Property</dt>
              <dd className="font-medium text-gray-900">{lease.propertyDisplayName ?? lease.propertyId ?? '—'}</dd>
            </div>
            {lease.unitId && (
              <div>
                <dt className="text-gray-500">Unit</dt>
                <dd className="font-medium text-gray-900">{lease.unitId}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Start date</dt>
              <dd className="font-medium text-gray-900">{lease.startDate}</dd>
            </div>
            <div>
              <dt className="text-gray-500">End date</dt>
              <dd className="font-medium text-gray-900">{lease.endDate}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Monthly rent</dt>
              <dd className="font-medium text-gray-900">${lease.monthlyRent.toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsPending ? (
            <LoadingState label="Loading payments…" variant="inline" />
          ) : paymentsError ? (
            <ErrorCard
              variant="compact"
              title="Couldn't load payment history"
              message="We couldn't fetch this lease's payment history. Try again in a moment."
              onRetry={() => refetchPayments()}
            />
          ) : payments.length === 0 ? (
            <div>
              <p className="text-sm text-gray-500">No payments recorded yet for this lease.</p>
              <Link
                to={recordPaymentHref}
                className="mt-3 inline-block rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Record the first payment
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="min-w-full text-sm" aria-label="Payment history">
                <thead>
                  <tr className="border-b text-start text-gray-500">
                    <th scope="col" className="pb-2 pe-4 font-medium">ID</th>
                    <th scope="col" className="pb-2 pe-4 font-medium">Date</th>
                    <th scope="col" className="pb-2 pe-4 font-medium">Amount</th>
                    <th scope="col" className="pb-2 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.paymentId}>
                      <td className="py-2 pe-4 font-mono text-gray-500">{p.paymentId.slice(-8)}</td>
                      <td className="py-2 pe-4 text-gray-700">{p.receivedAt.slice(0, 10)}</td>
                      <td className="py-2 pe-4 font-medium text-gray-900">${p.amount.toLocaleString()}</td>
                      <td className="py-2 text-gray-600">{p.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="mt-4">
                <Link
                  to={recordPaymentHref}
                  className="inline-block rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  + Record a new payment
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
