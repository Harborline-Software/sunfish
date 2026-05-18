/**
 * Bridge client for the /api/v1/cockpit/work-orders endpoint family.
 * W#74 PR 3 — MaintenancePage rebind (cockpit extension, Halt H4 ruling).
 *
 * Write endpoints require an X-XSRF-TOKEN header. Call getCsrfToken() before
 * any POST/PUT/DELETE and pass the result to the write function.
 * See apps/docs/blocks/cockpit/csrf-notes.md for the full wiring contract.
 */

export interface WorkOrderSummary {
  workOrderId: string
  status: string
  vendorId: string
  scheduledDate: string
  completedDate: string | null
  appointmentDate: string | null
}

export interface WorkOrderList {
  items: WorkOrderSummary[]
  total: number
  page: number
  pageSize: number
}

export interface WorkOrderDetail {
  workOrderId: string
  status: string
  scheduledDate: string
  completedDate: string | null
  vendorId: string
  vendorDisplayName: string
  notes: string | null
  entryNotices: EntryNoticeSummary[]
  appointment: AppointmentSummary | null
  completionAttestation: CompletionAttestationSummary | null
  auditTrail: string[]
}

export interface EntryNoticeSummary {
  plannedEntryUtc: string
  entryReason: string
}

export interface AppointmentSummary {
  slotStartUtc: string
  slotEndUtc: string
  status: string
}

export interface CompletionAttestationSummary {
  attestedAt: string
  signatureRef: string
}

export interface CreateWorkOrderInput {
  subject: string
  vendorId: string
  priority?: string
  propertyId?: string | null
  description?: string | null
  scheduledDate?: string | null
}

export interface CreateWorkOrderResult {
  workOrderId: string
  status: string
  createdAt: string
}

/** Fetches a fresh CSRF token from the cockpit antiforgery endpoint. */
export async function getCsrfToken(): Promise<string> {
  const resp = await fetch('/api/v1/cockpit/antiforgery-token', { credentials: 'include' })
  if (!resp.ok) {
    throw new Error(`Failed to fetch CSRF token: ${resp.status} ${resp.statusText}`)
  }
  const body = (await resp.json()) as { token: string }
  return body.token
}

export async function getWorkOrders(params?: {
  status?: string
  vendorId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}): Promise<WorkOrderList> {
  const qs = new URLSearchParams()
  if (params?.status)   qs.set('status', params.status)
  if (params?.vendorId) qs.set('vendorId', params.vendorId)
  if (params?.from)     qs.set('from', params.from)
  if (params?.to)       qs.set('to', params.to)
  if (params?.page)     qs.set('page', String(params.page))
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
  const url = `/api/v1/cockpit/work-orders${qs.size > 0 ? `?${qs}` : ''}`
  const resp = await fetch(url, { credentials: 'include' })
  if (!resp.ok) throw new Error(`Failed to load work orders: ${resp.status} ${resp.statusText}`)
  return (await resp.json()) as WorkOrderList
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
  csrfToken: string,
): Promise<CreateWorkOrderResult> {
  const resp = await fetch('/api/v1/cockpit/work-orders', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify(input),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Failed to create work order: ${resp.status} ${body}`)
  }
  return (await resp.json()) as CreateWorkOrderResult
}
