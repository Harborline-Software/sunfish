import { Link } from 'react-router-dom'
import { useVacancies } from '@/hooks/useUnits'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UnitSummary } from '@/api/units'

function unitBedBathLabel(unit: UnitSummary): string {
  const parts: string[] = []
  if (unit.bedrooms != null) parts.push(`${unit.bedrooms} bd`)
  if (unit.bathrooms != null) parts.push(`${unit.bathrooms} ba`)
  if (unit.squareFootage != null) parts.push(`${unit.squareFootage.toLocaleString()} sqft`)
  return parts.join(' · ') || 'No size info'
}

export function VacanciesPage() {
  const { data, isPending, isError, error, refetch } = useVacancies()
  const vacancies = data?.vacancies

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Loading vacancies…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">Failed to load vacancies</p>
        <p className="mt-1 text-sm text-gray-600">{error.message}</p>
        <button
          onClick={() => void refetch()}
          className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vacancies</h1>
        <p className="text-gray-500">
          {vacancies?.length
            ? `${vacancies.length} available unit${vacancies.length === 1 ? '' : 's'}`
            : 'No vacancies — all units are occupied'}
        </p>
      </div>

      {!vacancies?.length ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          No vacant units found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vacancies.map((unit) => (
            <Card key={unit.unitId}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Unit {unit.unitNumber}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-gray-500">{unit.propertyDisplayName}</p>
                  </div>
                  <Badge variant="success">Available</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{unitBedBathLabel(unit)}</p>
                {unit.notes && (
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">{unit.notes}</p>
                )}
                <Link
                  to={`/units/${encodeURIComponent(unit.unitId)}`}
                  className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                >
                  View unit →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
