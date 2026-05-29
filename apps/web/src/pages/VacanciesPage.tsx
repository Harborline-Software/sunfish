// Cohort-5 — Vacancy Administration page.
// Route: /vacancies
// Backed by GET /api/v1/vacancies (Bridge endpoint — cohort-5 pattern-009 pair).
// Shows all vacant units across all properties for the authenticated tenant,
// with listing status badges and quick-navigate to unit detail.

import { useNavigate } from 'react-router-dom'
import { useVacancies } from '@/hooks/useUnits'
import { Badge } from '@/components/ui/badge'
import { ErrorCard, LoadingState } from '@sunfish/ui-react'
import type { VacancySummary } from '@/api/units'

export function VacanciesPage() {
  const { data, isPending, isError, error, refetch } = useVacancies()

  if (isPending) return <LoadingState label="Loading vacancies…" />

  if (isError) {
    return (
      <ErrorCard
        title="Failed to load vacancies"
        message={(error as Error).message}
        onRetry={refetch}
      />
    )
  }

  const vacancies = data?.vacancies ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vacancies</h1>
        <p className="mt-1 text-sm text-gray-500">
          {vacancies.length === 0
            ? 'All units are currently occupied.'
            : `${vacancies.length} vacant ${vacancies.length === 1 ? 'unit' : 'units'}`}
        </p>
      </div>

      {vacancies.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 text-gray-500">
          <span>No vacancies — all units occupied.</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm" aria-label="Vacant units">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Days vacant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Asking rent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Listing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {vacancies.map((v) => (
                <VacancyRow key={v.unitId} vacancy={v} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function VacancyRow({ vacancy: v }: { vacancy: VacancySummary }) {
  const navigate = useNavigate()

  const sizeParts: string[] = []
  if (v.bedrooms !== null) sizeParts.push(`${v.bedrooms} bd`)
  if (v.bathrooms !== null) sizeParts.push(`${v.bathrooms} ba`)
  if (v.squareFeet !== null) sizeParts.push(`${v.squareFeet.toLocaleString()} ft²`)
  const sizeLabel = sizeParts.length > 0 ? sizeParts.join(' · ') : '—'

  const daysLabel =
    v.daysVacant === 0 ? 'Today' : `${v.daysVacant} ${v.daysVacant === 1 ? 'day' : 'days'}`

  const rentLabel =
    v.askingRent !== null
      ? `$${v.askingRent.toLocaleString('en-US', { minimumFractionDigits: 0 })}/mo`
      : '—'

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={`Unit ${v.unitNumber} at ${v.propertyDisplayName}`}
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => navigate(`/units/${v.unitId}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/units/${v.unitId}`)
      }}
    >
      <td className="px-4 py-3 font-medium text-gray-900">{v.unitNumber}</td>
      <td className="px-4 py-3">
        <div className="text-gray-900">{v.propertyDisplayName}</div>
        <div className="text-xs text-gray-500">{v.propertyAddress}</div>
      </td>
      <td className="px-4 py-3 text-gray-700">{sizeLabel}</td>
      <td className="px-4 py-3 text-gray-700">{daysLabel}</td>
      <td className="px-4 py-3 text-gray-700">{rentLabel}</td>
      <td className="px-4 py-3">
        <ListingStatusBadge status={v.listingStatus} />
      </td>
    </tr>
  )
}

function ListingStatusBadge({ status }: { status: VacancySummary['listingStatus'] }) {
  if (status === 'Listed') return <Badge variant="success">Listed</Badge>
  if (status === 'Reserved') return <Badge variant="secondary">Reserved</Badge>
  return <Badge variant="outline">Unlisted</Badge>
}
