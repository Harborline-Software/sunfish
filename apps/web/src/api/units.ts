/**
 * Bridge client for the unit + vacancy endpoint family.
 * Cohort-5 — property unit detail + vacancy admin.
 *
 * Wire shape: BE-canonical (signal-bridge#54). No tenant_id in response
 * (server-derived from ITenantContext per ADR 0092 / Amendment I).
 */

import { throwFromResponse } from './problem-details'
export { ProblemDetailsError } from './problem-details'

export interface ActiveLease {
  leaseId: string
  endDate: string
  monthlyRent: number
}

export interface LastInspection {
  scheduledDate: string
  phase: string | null
}

export interface UnitSummary {
  unitId: string
  propertyId: string
  unitNumber: string
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  occupancyStatus: 'Vacant' | 'Occupied' | 'Reserved'
  activeLease: ActiveLease | null
  notes: string | null
}

export interface UnitDetail extends UnitSummary {
  lastInspection: LastInspection | null
  openWorkOrders: number
}

export interface UnitList {
  units: UnitSummary[]
}

// BE returns UnitListDto (key: units) for both the property-units list and the vacancies route.
export type VacancyList = UnitList

export async function getUnits(propertyId: string): Promise<UnitList> {
  const resp = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}/units`, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load units')
  return (await resp.json()) as UnitList
}

export async function getUnit(unitId: string): Promise<UnitDetail> {
  const resp = await fetch(`/api/v1/units/${encodeURIComponent(unitId)}`, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load unit')
  return (await resp.json()) as UnitDetail
}

export async function getVacancies(): Promise<VacancyList> {
  const resp = await fetch('/api/v1/vacancies/', { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load vacancies')
  return (await resp.json()) as VacancyList
}
