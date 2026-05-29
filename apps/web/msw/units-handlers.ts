import { http, HttpResponse } from 'msw'
import type { UnitSummary, UnitList, VacancyList } from '../src/api/units'

const MOCK_UNITS: UnitSummary[] = [
  {
    unitId: 'unit:dev-tenant/unit-001',
    propertyId: 'prop:dev-tenant/prop-001',
    propertyDisplayName: 'Maple Street Apartments',
    unitNumber: '1A',
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 850,
    status: 'Available',
    createdAt: '2024-01-15T00:00:00Z',
    notes: 'Freshly painted. Corner unit with natural light.',
  },
  {
    unitId: 'unit:dev-tenant/unit-002',
    propertyId: 'prop:dev-tenant/prop-001',
    propertyDisplayName: 'Maple Street Apartments',
    unitNumber: '2B',
    bedrooms: 1,
    bathrooms: 1,
    squareFootage: 620,
    status: 'Occupied',
    createdAt: '2024-01-15T00:00:00Z',
    notes: null,
  },
  {
    unitId: 'unit:dev-tenant/unit-003',
    propertyId: 'prop:dev-tenant/prop-002',
    propertyDisplayName: 'Oak Avenue Duplex',
    unitNumber: 'Main',
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1200,
    status: 'Available',
    createdAt: '2024-03-01T00:00:00Z',
    notes: 'New appliances. Attached garage.',
  },
  {
    unitId: 'unit:dev-tenant/unit-004',
    propertyId: 'prop:dev-tenant/prop-002',
    propertyDisplayName: 'Oak Avenue Duplex',
    unitNumber: 'Lower',
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 900,
    status: 'MaintenanceHold',
    createdAt: '2024-03-01T00:00:00Z',
    notes: 'HVAC replacement in progress.',
  },
]

export const unitsHandlers = [
  http.get('/api/v1/units', ({ request }) => {
    const url = new URL(request.url)
    const propertyId = url.searchParams.get('propertyId')
    const units = propertyId
      ? MOCK_UNITS.filter((u) => u.propertyId === propertyId)
      : MOCK_UNITS
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
    return HttpResponse.json(unit)
  }),

  http.get('/api/v1/vacancies', () => {
    const vacancies = MOCK_UNITS.filter((u) => u.status === 'Available')
    return HttpResponse.json({ vacancies } satisfies VacancyList)
  }),
]
