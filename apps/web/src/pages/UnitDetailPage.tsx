// Cohort-5 — Unit Detail page.
// Route: /units/:unitId
// Backed by GET /api/v1/units/{unitId} (Bridge endpoint — cohort-5 pattern-009 pair).
// Shows unit info, current occupancy, active lease summary, last inspection,
// and open work-order count.

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useUnitDetail } from '@/hooks/useUnits'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorCard, LoadingState } from '@sunfish/ui-react'
import { UnitNotFoundError } from '@/api/units'

export function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useUnitDetail(unitId ?? '')

  if (!unitId) {
    return (
      <ErrorCard title="Invalid unit" message="No unit ID provided." />
    )
  }

  if (isPending) return <LoadingState label="Loading unit…" />

  if (isError) {
    if (error instanceof UnitNotFoundError) {
      return (
        <div className="text-center py-16">
          <p className="text-gray-500">Unit not found.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm text-blue-600 underline hover:text-blue-800"
          >
            Go back
          </button>
        </div>
      )
    }
    return (
      <ErrorCard
        title="Failed to load unit"
        message={(error as Error).message}
        onRetry={refetch}
      />
    )
  }

  const unit = data!

  const sizeParts: string[] = []
  if (unit.bedrooms !== null) sizeParts.push(`${unit.bedrooms} bedroom${unit.bedrooms !== 1 ? 's' : ''}`)
  if (unit.bathrooms !== null) sizeParts.push(`${unit.bathrooms} bathroom${unit.bathrooms !== 1 ? 's' : ''}`)
  if (unit.squareFeet !== null) sizeParts.push(`${unit.squareFeet.toLocaleString()} ft²`)

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link to="/properties" className="hover:text-gray-900">
          Properties
        </Link>
        {' / '}
        <Link to="/properties" className="hover:text-gray-900">
          {unit.propertyDisplayName}
        </Link>
        {' / '}
        <span className="text-gray-900">{unit.unitNumber}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unit {unit.unitNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">{unit.propertyDisplayName}</p>
          {sizeParts.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">{sizeParts.join(' · ')}</p>
          )}
        </div>
        <OccupancyBadge status={unit.occupancyStatus} />
      </div>

      {/* Detail cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Active lease */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Active Lease
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unit.activeLease ? (
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{unit.activeLease.tenantDisplayName}</p>
                <p className="text-sm text-gray-500">
                  ${unit.activeLease.monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 0 })}/mo
                </p>
                <p className="text-sm text-gray-500">
                  Ends{' '}
                  {new Date(unit.activeLease.endDate).toLocaleDateString('en-US', {
                    dateStyle: 'medium',
                  })}
                </p>
                <Link
                  to={`/leases/${unit.activeLease.leaseId}`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View lease →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active lease</p>
            )}
          </CardContent>
        </Card>

        {/* Last inspection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Last Inspection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unit.lastInspectionDate ? (
              <div className="space-y-1">
                <p className="font-medium text-gray-900">
                  {new Date(unit.lastInspectionDate).toLocaleDateString('en-US', {
                    dateStyle: 'medium',
                  })}
                </p>
                {unit.lastInspectionResult && (
                  <p className="text-sm text-gray-500">{unit.lastInspectionResult}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No inspections on record</p>
            )}
          </CardContent>
        </Card>

        {/* Work orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Open Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${unit.openWorkOrderCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}
            >
              {unit.openWorkOrderCount}
            </p>
            {unit.openWorkOrderCount > 0 && (
              <Link
                to="/maintenance"
                className="mt-1 block text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View maintenance →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OccupancyBadge({ status }: { status: 'Occupied' | 'Vacant' | 'Reserved' }) {
  if (status === 'Occupied') return <Badge variant="success">Occupied</Badge>
  if (status === 'Reserved') return <Badge variant="secondary">Reserved</Badge>
  return <Badge variant="warning">Vacant</Badge>
}
