import { http, HttpResponse } from 'msw'
import type { UnitSummary, UnitDetail, UnitList, VacancyList } from '../src/api/units'

const MOCK_UNITS: UnitDetail[] = [
  {
    unitId: 'unit:dev-tenant/unit-001',
    propertyId: 'prop:dev-tenant/prop-001',
    unitNumber: '1A',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 850,
    occupancyStatus: 'Vacant',
    activeLease: null,
    notes: 'Freshly painted. Corner unit with natural light.',
    lastInspection: { scheduledDate: '2024-03-15', phase: 'Move-out' },
    openWorkOrders: 0,
  },
  {
    unitId: 'unit:dev-tenant/unit-002',
    propertyId: 'prop:dev-tenant/prop-001',
    unitNumber: '2B',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 620,
    occupancyStatus: 'Occupied',
    activeLease: { leaseId: 'lease:dev-tenant/lease-001', endDate: '2025-01-31', monthlyRent: 1400 },
    notes: null,
    lastInspection: null,
    openWorkOrders: 1,
  },
  {
    unitId: 'unit:dev-tenant/unit-003',
    propertyId: 'prop:dev-tenant/prop-002',
    unitNumber: 'Main',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1200,
    occupancyStatus: 'Vacant',
    activeLease: null,
    notes: 'New appliances. Attached garage.',
    lastInspection: { scheduledDate: '2024-04-01', phase: 'Pre-listing' },
    openWorkOrders: 0,
  },
  {
    unitId: 'unit:dev-tenant/unit-004',
    propertyId: 'prop:dev-tenant/prop-002',
    unitNumber: 'Lower',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    occupancyStatus: 'Reserved',
    activeLease: null,
    notes: 'HVAC replacement in progress.',
    lastInspection: null,
    openWorkOrders: 2,
  },
]

function toSummary(unit: UnitDetail): UnitSummary {
  const { lastInspection: _l, openWorkOrders: _o, ...summary } = unit
  return summary
}

export const unitsHandlers = [
  http.get('/api/v1/properties/:propertyId/units', ({ params }) => {
    const propertyId = decodeURIComponent(params.propertyId as string)
    const units = MOCK_UNITS.filter((u) => u.propertyId === propertyId).map(toSummary)
    return HttpResponse.json({ units } satisfies UnitList)
  }),

  http.get('/api/v1/units/:unitId', ({ params }) => {
    const unit = MOCK_UNITS.find((u) => u.unitId === decodeURIComponent(params.unitId as string))
    if (!unit) {
      return HttpResponse.json(
        { title: 'not_found', status: 404, detail: 'Unit not found' },
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    return HttpResponse.json(unit satisfies UnitDetail)
  }),

  // Trailing slash matches BE MapGroup("/api/v1/vacancies").MapGet("/") registration
  http.get('/api/v1/vacancies/', () => {
    const units = MOCK_UNITS.filter((u) => u.occupancyStatus === 'Vacant').map(toSummary)
    return HttpResponse.json({ units } satisfies VacancyList)
  }),
]
