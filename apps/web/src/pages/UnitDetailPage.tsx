import { Link, useParams } from 'react-router-dom'
import { useUnit } from '@/hooks/useUnits'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UnitSummary } from '@/api/units'

function statusVariant(status: UnitSummary['status']) {
  switch (status) {
    case 'Available': return 'success' as const
    case 'Occupied': return 'default' as const
    case 'MaintenanceHold': return 'secondary' as const
  }
}

function statusLabel(status: UnitSummary['status']) {
  switch (status) {
    case 'Available': return 'Available'
    case 'Occupied': return 'Occupied'
    case 'MaintenanceHold': return 'Maintenance Hold'
  }
}

export function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const { data: unit, isPending, isError, error } = useUnit(unitId ?? '')

  if (isPending) {
    return <div className="flex items-center justify-center h-48 text-gray-500">Loading unit…</div>
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">Failed to load unit</p>
        <p className="mt-1 text-sm text-gray-600">{error.message}</p>
        <Link to="/vacancies" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          ← Back to vacancies
        </Link>
      </div>
    )
  }

  if (!unit) return null

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/vacancies" className="text-sm text-blue-600 hover:underline">
          ← Vacancies
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Unit {unit.unitNumber}</h1>
        <Badge variant={statusVariant(unit.status)}>{statusLabel(unit.status)}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Unit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Property</dt>
              <dd className="font-medium text-gray-900">{unit.propertyDisplayName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Unit Number</dt>
              <dd className="font-medium text-gray-900">{unit.unitNumber}</dd>
            </div>
            {unit.bedrooms != null && (
              <div>
                <dt className="text-gray-500">Bedrooms</dt>
                <dd className="font-medium text-gray-900">{unit.bedrooms}</dd>
              </div>
            )}
            {unit.bathrooms != null && (
              <div>
                <dt className="text-gray-500">Bathrooms</dt>
                <dd className="font-medium text-gray-900">{unit.bathrooms}</dd>
              </div>
            )}
            {unit.squareFootage != null && (
              <div>
                <dt className="text-gray-500">Square Footage</dt>
                <dd className="font-medium text-gray-900">{unit.squareFootage.toLocaleString()} sqft</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <Badge variant={statusVariant(unit.status)}>{statusLabel(unit.status)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Added</dt>
              <dd className="font-medium text-gray-900">
                {new Date(unit.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
          {unit.notes && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-700">{unit.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
