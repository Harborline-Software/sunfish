import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Signature verification state
// ---------------------------------------------------------------------------

export type SignatureState = 'Verified' | 'VerificationFailed' | 'NotSigned'

// ---------------------------------------------------------------------------
// Audit event shapes
// ---------------------------------------------------------------------------

export interface AuditEventSummary {
  audit_id: string
  occurred_at: string             // ISO 8601 UTC
  event_type: string              // e.g. "Security.TenantBoundaryViolation"
  actor: string | null            // username or system identity
  correlation_id: string | null   // null for pre-retrofit events (Decision 3)
  payload_summary: Record<string, unknown>
  signature_state: SignatureState
}

// AuditEventDetail is the same wire shape as AuditEventSummary — the detail
// endpoint returns the same AuditEventDto (6 fields). Payload fields are in
// payload_summary (inherited from AuditEventSummary). No tenant_id, payload,
// or signatures on the wire — see signal-bridge AuditEventsDtos.cs.
// Forward-watch: signatures surface will be added when Engineer ships
// IOperationVerifier; tenant_id will surface when whoami exposes tenant mapping.
export type AuditEventDetail = AuditEventSummary

// ---------------------------------------------------------------------------
// Paginated list response
// ---------------------------------------------------------------------------

export interface AuditEventsListResponse {
  events: AuditEventSummary[]
  next_cursor: string | null      // null when no further pages
  has_more: boolean
}

// ---------------------------------------------------------------------------
// Filter parameters
// ---------------------------------------------------------------------------

export interface AuditEventFilters {
  from?: string                   // ISO date (YYYY-MM-DD)
  to?: string                     // ISO date (YYYY-MM-DD)
  eventType?: string              // AuditEventType enum string
  correlationId?: string          // GUID
  severity?: 'Security' | 'Financial' | 'Messaging' | 'Authentication'
}

// ---------------------------------------------------------------------------
// Known AuditEventType constants
// ---------------------------------------------------------------------------

export const KNOWN_AUDIT_EVENT_TYPES = [
  'Messaging.MessageDispatched',
  'Messaging.MessageFailed',
  'Financial.InvoicePosted',
  'Financial.PaymentRecorded',
  'Financial.JournalPosted',
  'Security.TenantBoundaryViolation',
  'Security.AuthenticationFailed',
] as const

export type KnownAuditEventType = (typeof KNOWN_AUDIT_EVENT_TYPES)[number]

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class TenantChangedError extends Error {
  readonly cause = 'tenant_changed' as const
  constructor() {
    super('Tenant changed — reload required')
    this.name = 'TenantChangedError'
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAuditEvents(filters: AuditEventFilters) {
  return useInfiniteQuery({
    queryKey: ['audit-events', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      if (filters.eventType) params.append('event_type', filters.eventType)
      if (filters.correlationId) params.append('correlation_id', filters.correlationId)
      // severity is a client-side filter only — the Bridge endpoint does not
      // accept a severity param; sending it is silently ignored. Filter is
      // applied post-fetch in AuditEventsPage. Forward-watch: Engineer to add
      // server-side severity → event_type prefix mapping in cohort-5+.
      // G1 — cursor passed verbatim; no URL re-encoding, no JSON-parse
      if (pageParam) params.append('cursor', pageParam)

      const response = await fetch(`/api/v1/audit-events?${params}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      // G1 — 400 tenant_changed: discard cursor; reset to page 1
      // Bridge returns RFC 7807 ProblemDetails; the error code is in `title`.
      if (response.status === 400) {
        const body = await response.json().catch(() => ({}))
        if (body.title === 'tenant_changed_reload_page') {
          throw new TenantChangedError()
        }
      }

      if (!response.ok) {
        throw new Error(`Audit events fetch failed: ${response.status}`)
      }

      return response.json() as Promise<AuditEventsListResponse>
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    // G1 — cursor must not appear in any logging sink; telemetry middleware checks this flag
    meta: { logCursor: false },
    retry: (failureCount, error) => {
      // G1 — do not retry tenant_changed errors; stale cursor cannot be recovered
      if (error instanceof TenantChangedError) return false
      return failureCount < 3
    },
  })
}

export function useAuditEventDetail(auditId: string) {
  return useQuery({
    queryKey: ['audit-event', auditId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/audit-events/${auditId}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Audit event fetch failed: ${response.status}`)
      }
      return response.json() as Promise<AuditEventDetail>
    },
    enabled: Boolean(auditId),
  })
}
