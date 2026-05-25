import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getCockpitWorkOrderDetail } from '@/cockpit/api'
import { ErrorCard, LoadingState } from '@sunfish/ui-react'

/**
 * W#29 Phase 3 — work-order detail view.
 *
 * Shows the full WO state: vendor, scheduled/completed dates, status,
 * appointment, entry notices, completion attestation, and the last
 * 10 audit-trail GUIDs. The "linked inspection" field from the
 * hand-off is omitted (WorkOrder has no Inspection FK; the cross-link
 * is unresolved until W#62 or a follow-on).
 */
export function WorkOrderDetailView() {
  const { workOrderId } = useParams<{ workOrderId: string }>()
  const id = workOrderId ?? ''

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['cockpit-work-order-detail', id],
    queryFn: () => getCockpitWorkOrderDetail(id),
    enabled: id.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  })

  if (!id) return <NotFound />

  if (isPending) return <LoadingState label="Loading work order…" variant="inline" />

  if (isError) {
    const isNotFound = error instanceof Error && error.message === 'Work order not found'
    if (isNotFound) return <NotFound />
    return (
      <ErrorCard
        variant="compact"
        title="Failed to load work order"
        message={error instanceof Error ? error.message : String(error)}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div>
      <header className="mb-6">
        <Link to="/cockpit/work-orders" className="text-sm text-blue-600 hover:underline">
          ← Back to work orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{data.workOrderId}</h1>
        <p className="text-sm text-gray-500">
          {data.status} · {data.vendorDisplayName} · Scheduled {data.scheduledDate}
          {data.completedDate ? ` · Completed ${data.completedDate}` : ''}
        </p>
      </header>

      {data.notes && (
        <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Notes</h2>
          <p className="text-sm text-gray-700">{data.notes}</p>
        </section>
      )}

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Appointment</h2>
        {data.appointment ? (
          <p className="text-sm text-gray-700">
            {new Date(data.appointment.slotStartUtc).toLocaleString()} →{' '}
            {new Date(data.appointment.slotEndUtc).toLocaleString()} ·{' '}
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{data.appointment.status}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">No appointment proposed.</p>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Entry notices</h2>
        {data.entryNotices.length === 0 ? (
          <p className="text-sm text-gray-500">No entry notices recorded.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.entryNotices.map((n, i) => (
              <li key={i} className="py-2 text-sm">
                <span className="font-medium text-gray-900">
                  {new Date(n.plannedEntryUtc).toLocaleString()}
                </span>
                <span className="ml-2 text-gray-600">{n.entryReason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Completion attestation</h2>
        {data.completionAttestation ? (
          <p className="text-sm text-gray-700">
            Attested at {new Date(data.completionAttestation.attestedAt).toLocaleString()} ·{' '}
            <span className="text-gray-500">signature {data.completionAttestation.signatureRef}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">Not yet attested.</p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Audit trail (last 10)</h2>
        {data.auditTrail.length === 0 ? (
          <p className="text-sm text-gray-500">No audit records.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs text-gray-600">
            {data.auditTrail.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function NotFound() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Work order not found</h2>
      <Link
        to="/cockpit/work-orders"
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← Back to work orders
      </Link>
    </div>
  )
}
