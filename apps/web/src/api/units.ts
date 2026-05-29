// Cohort-5 property-management MVP — unit + vacancy API client.
// Wired onto Bridge endpoints:
//   GET /api/v1/vacancies              → VacancyList
//   GET /api/v1/units/{unitId}         → UnitDetail
//   GET /api/v1/properties/{id}/units  → PropertyUnitList
//
// Bridge endpoints are authored by Engineer as the pattern-009 pair for
// cohort-5. This client is written against the agreed DTO contract; the
// MSW mock handlers in /msw/ back unit tests until the real Bridge surface
// is on signal-bridge/main.

// ---------------------------------------------------------------------------
// Vacancy admin surface — GET /api/v1/vacancies
// ---------------------------------------------------------------------------

export interface VacancySummary {
  unitId: string
  unitNumber: string
  propertyId: string
  propertyDisplayName: string
  propertyAddress: string
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  lastVacatedDate: string | null   // ISO 8601 date string or null
  daysVacant: number
  askingRent: number | null
  listingStatus: 'Listed' | 'Unlisted' | 'Reserved'
}

export interface VacancyList {
  vacancies: VacancySummary[]
  totalCount: number
}

export async function getVacancies(): Promise<VacancyList> {
  const resp = await fetch('/api/v1/vacancies', { credentials: 'include' })
  if (!resp.ok) {
    throw new Error(`Failed to load vacancies: ${resp.status} ${resp.statusText}`)
  }
  return (await resp.json()) as VacancyList
}

// ---------------------------------------------------------------------------
// Unit detail — GET /api/v1/units/{unitId}
// ---------------------------------------------------------------------------

export interface ActiveLeaseDetail {
  leaseId: string
  tenantDisplayName: string
  monthlyRent: number
  startDate: string
  endDate: string
}

export interface UnitDetail {
  unitId: string
  unitNumber: string
  propertyId: string
  propertyDisplayName: string
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  occupancyStatus: 'Available' | 'Occupied' | 'MaintenanceHold'
  activeLease: ActiveLeaseDetail | null
  lastInspectionDate: string | null
  lastInspectionResult: string | null
  openWorkOrderCount: number
}

export async function getUnitDetail(unitId: string): Promise<UnitDetail> {
  const resp = await fetch(`/api/v1/units/${encodeURIComponent(unitId)}`, {
    credentials: 'include',
  })
  if (resp.status === 404) {
    throw new UnitNotFoundError(unitId)
  }
  if (!resp.ok) {
    throw new Error(`Failed to load unit: ${resp.status} ${resp.statusText}`)
  }
  return (await resp.json()) as UnitDetail
}

export class UnitNotFoundError extends Error {
  constructor(public readonly unitId: string) {
    super(`Unit not found: ${unitId}`)
    this.name = 'UnitNotFoundError'
  }
}

// ---------------------------------------------------------------------------
// Property unit list — GET /api/v1/properties/{propertyId}/units
// ---------------------------------------------------------------------------

export interface UnitSummary {
  unitId: string
  unitNumber: string
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  occupancyStatus: 'Available' | 'Occupied' | 'MaintenanceHold'
  activeLease: {
    leaseId: string
    tenantDisplayName: string
    monthlyRent: number
    endDate: string
  } | null
}

export interface PropertyUnitList {
  units: UnitSummary[]
}

export async function getPropertyUnits(propertyId: string): Promise<PropertyUnitList> {
  const resp = await fetch(
    `/api/v1/properties/${encodeURIComponent(propertyId)}/units`,
    { credentials: 'include' }
  )
  if (!resp.ok) {
    throw new Error(`Failed to load units for property: ${resp.status} ${resp.statusText}`)
  }
  return (await resp.json()) as PropertyUnitList
}
