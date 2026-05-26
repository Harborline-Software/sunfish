/**
 * Bridge client for the /api/v1/leases cluster endpoint family.
 * W#74 PR 2 — Anchor React Cohort 1 rebind.
 *
 * Mirrors the cockpit/api.ts style: relative URL, credentials: 'include',
 * throw on non-2xx. The Tauri shell resolves the base URL at startup.
 */

import { throwFromResponse } from './problem-details'
export { ProblemDetailsError } from './problem-details'

export interface LeaseSummary {
  leaseId: string
  tenantDisplayName: string
  propertyId: string | null
  propertyDisplayName: string | null
  unitId: string | null
  startDate: string
  endDate: string
  monthlyRent: number
  status: 'Active' | 'Expired' | 'Terminated'
}

export interface LeaseList {
  leases: LeaseSummary[]
}

export interface LeaseDetail extends LeaseSummary {
  securityDeposit: number | null
  leaseTerm: string | null
  tenants: LeaseTenant[]
  notes: string | null
}

export interface LeaseTenant {
  partyId: string
  displayName: string
}

export async function getLeases(phase?: 'Active' | 'Expired' | 'All'): Promise<LeaseList> {
  const url = phase ? `/api/v1/leases?phase=${encodeURIComponent(phase)}` : '/api/v1/leases'
  const resp = await fetch(url, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load leases')
  return (await resp.json()) as LeaseList
}

export async function getLease(leaseId: string): Promise<LeaseDetail> {
  const resp = await fetch(`/api/v1/leases/${encodeURIComponent(leaseId)}`, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load lease')
  return (await resp.json()) as LeaseDetail
}
