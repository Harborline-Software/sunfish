import { ErrorCard, LoadingState } from '@sunfish/ui-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getCockpitProperties } from '@/cockpit/api'

/**
 * W#29 Phase 1 — Cockpit landing page. Lists every property the
 * authenticated tenant manages; clicking one routes to the property-detail
 * view (PR 2).
 *
 * Hand-off OQ-OC3: poll-on-focus refresh. `refetchOnWindowFocus: true` plus
 * a 30s `staleTime` so context-switching back to the tab pulls fresh data
 * without hammering the endpoint.
 */
export function PropertySelector() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['cockpit-properties'],
    queryFn: getCockpitProperties,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  })

  if (isPending) return <LoadingState label="Loading properties…" />

  if (isError) {
    return (
      <ErrorCard
        title="Failed to load cockpit properties"
        message={error.message}
        onRetry={() => void refetch()}
      />
    )
  }

  const properties = data.properties

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">No properties yet</h2>
        <p className="mt-2 text-sm text-gray-500">
          Add a property in the operational UI; it will appear here for cockpit oversight.
        </p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Owner Cockpit</h1>
        <p className="text-sm text-gray-500">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'}
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <li key={p.propertyId}>
            <Link
              to={`/cockpit/${encodeURIComponent(p.propertyId)}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
            >
              <p className="font-semibold text-gray-900">{p.displayName}</p>
              <p className="mt-1 text-xs text-gray-500">
                {p.city}, {p.region} · {p.kind}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
