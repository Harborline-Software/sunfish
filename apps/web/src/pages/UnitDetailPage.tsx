import { Link, useParams } from 'react-router-dom'
import { useUnit } from '@/hooks/useUnits'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UnitDetail } from '@/api/units'

function statusVariant(status: UnitDetail['occupancyStatus']) {
  switch (status) {
    case 'Vacant': return 'success' as const
    case 'Occupied': return 'default' as const
    case 'Reserved': return 'secondary' as const
  }
}

function statusLabel(status: UnitDetail['occupancyStatus']) {
  switch (status) {
    case 'Vacant': return 'Vacant'
    case 'Occupied': return 'Occupied'
    case 'Reserved': return 'Maintenance Hold'
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
        <Badge variant={statusVariant(unit.occupancyStatus)}>{statusLabel(unit.occupancyStatus)}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Unit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Property</dt>
              <dd className="font-medium text-gray-900">{unit.propertyId}</dd>
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
            {unit.squareFeet != null && (
              <div>
                <dt className="text-gray-500">Square Footage</dt>
                <dd className="font-medium text-gray-900">{unit.squareFeet.toLocaleString()} sqft</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <Badge variant={statusVariant(unit.occupancyStatus)}>{statusLabel(unit.occupancyStatus)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Open Work Orders</dt>
              <dd className="font-medium text-gray-900">{unit.openWorkOrders}</dd>
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

      {unit.activeLease && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Active Lease</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Lease ID</dt>
                <dd className="font-medium text-gray-900 font-mono text-xs">{unit.activeLease.leaseId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">End Date</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(unit.activeLease.endDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Monthly Rent</dt>
                <dd className="font-medium text-gray-900">
                  ${unit.activeLease.monthlyRent.toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {unit.lastInspection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Scheduled Date</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(unit.lastInspection.scheduledDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Phase</dt>
                <dd className="font-medium text-gray-900">{unit.lastInspection.phase}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
