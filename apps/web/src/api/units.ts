/**
 * Bridge client for the /api/v1/units + /api/v1/vacancies endpoint family.
 * Cohort-5 — property unit detail + vacancy admin.
 *
 * Bridge endpoints: pending Engineer delivery (signal-bridge PR, routed via
 * coordination/inbox/fed-status-2026-05-29T0230Z-cohort-5-claim-bridge-gap-found.md).
 * Substrate: blocks-properties/IPropertyUnitRepository + UnitStatus enum.
 *
 * Wire shape: mirrors PropertyUnit model fields; no tenant_id in response
 * (server-derived from ITenantContext per ADR 0092 / Amendment I).
 */

import { throwFromResponse } from './problem-details'
export { ProblemDetailsError } from './problem-details'

export interface UnitSummary {
  unitId: string
  propertyId: string
  propertyDisplayName: string
  unitNumber: string
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  status: 'Available' | 'Occupied' | 'MaintenanceHold'
  createdAt: string
  notes: string | null
}

export interface UnitList {
  units: UnitSummary[]
}

export interface VacancyList {
  vacancies: UnitSummary[]
}

export async function getUnits(propertyId?: string): Promise<UnitList> {
  const url = propertyId
    ? `/api/v1/units?propertyId=${encodeURIComponent(propertyId)}`
    : '/api/v1/units'
  const resp = await fetch(url, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load units')
  return (await resp.json()) as UnitList
}

export async function getUnit(unitId: string): Promise<UnitSummary> {
  const resp = await fetch(`/api/v1/units/${encodeURIComponent(unitId)}`, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load unit')
  return (await resp.json()) as UnitSummary
}

export async function getVacancies(): Promise<VacancyList> {
  const resp = await fetch('/api/v1/vacancies', { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load vacancies')
  return (await resp.json()) as VacancyList
}
