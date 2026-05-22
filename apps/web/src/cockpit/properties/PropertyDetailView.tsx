import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getCockpitPropertyDetail } from '@/cockpit/api'
import { ErrorCard } from '@/components/ErrorCard'
import { LoadingState } from '@/components/LoadingState'

/**
 * W#29 Phase 2 — Cockpit property detail view.
 *
 * Renders the property card + equipment list from the
 * `GET /api/v1/cockpit/{propertyId}/detail` endpoint. The active-lease,
 * open-work-order-count, last-inspection-date, and last-inspection-result
 * fields are stubbed (null/0) on the server until W#62 (PropertyUnit
 * substrate) lands; this view renders an explicit "coming soon" note
 * for those sections instead of pretending they're empty.
 */
export function PropertyDetailView() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const idValue = propertyId ?? ''

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['cockpit-property-detail', idValue],
    queryFn: () => getCockpitPropertyDetail(idValue),
    enabled: idValue.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  })

  if (!idValue) {
    return <NotFound />
  }

  if (isPending) return <LoadingState label="Loading property…" />

  if (isError) {
    const isNotFound = error instanceof Error && error.message === 'Property not found'
    if (isNotFound) return <NotFound />
    return (
      <ErrorCard
        title="Failed to load property"
        message={error instanceof Error ? error.message : String(error)}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div>
      <header className="mb-6">
        <Link to="/cockpit" className="text-sm text-blue-600 hover:underline">
          ← Back to cockpit
        </Link>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{data.propertyId}</h1>
          <Link
            to={`/cockpit/${encodeURIComponent(data.propertyId)}/dashboard`}
            className="text-sm text-blue-600 hover:underline"
          >
            View dashboard →
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {data.displayAddress} · {data.kind}
        </p>
      </header>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Equipment</h2>
        {data.equipment.length === 0 ? (
          <p className="text-sm text-gray-500">No equipment recorded for this property.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.equipment.map((e) => (
              <li key={e.equipmentId} className="py-2">
                <p className="font-medium text-gray-900">{e.displayName}</p>
                <p className="text-xs text-gray-500">
                  {e.class}
                  {e.make ? ` · ${e.make}` : ''}
                  {e.model ? ` ${e.model}` : ''}
                  {e.locationInProperty ? ` · ${e.locationInProperty}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Lease, work orders, inspections</h2>
        <p className="text-sm text-gray-500">
          Lease summary, open work-order count, and last-inspection date will appear here once the
          property-unit substrate (W#62) lands. Until then, browse the operational views from the
          top navigation.
        </p>
      </section>
    </div>
  )
}

function NotFound() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Property not found</h2>
      <p className="mt-2 text-sm text-gray-500">
        This property is not in your tenant's scope.
      </p>
      <Link
        to="/cockpit"
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← Back to cockpit
      </Link>
    </div>
  )
}
