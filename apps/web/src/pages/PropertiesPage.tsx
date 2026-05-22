import { useProperties } from '@/hooks/useProperties'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// W#74 PR 1: rebound from ERPNext API to /api/v1/properties Bridge cluster endpoint.
import type { PropertySummary } from '@/api/properties'
import { ErrorCard } from '@/components/ErrorCard'
import { LoadingState } from '@/components/LoadingState'

function statusVariant(status: PropertySummary['status']) {
  switch (status) {
    case 'Active': return 'success' as const
    case 'Vacant': return 'warning' as const
    case 'Maintenance': return 'secondary' as const
    case 'Sold': return 'outline' as const
  }
}

export function PropertiesPage() {
  const { data, isPending, isError, error, refetch } = useProperties()
  const properties = data?.properties

  if (isPending) return <LoadingState label="Loading properties…" />

  if (isError) {
    return (
      <ErrorCard
        title="Failed to load properties"
        message={error.message}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!properties?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No properties found. Add a property in the cockpit to get started.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <p className="text-gray-500">{properties.length} properties</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <Card key={p.propertyId}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{p.displayName}</CardTitle>
                <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
              </div>
              <CardDescription>
                {[p.addressLine1, p.city, p.region].filter(Boolean).join(', ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                {p.unitCount} {p.unitCount === 1 ? 'unit' : 'units'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
