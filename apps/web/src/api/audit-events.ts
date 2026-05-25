import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

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
  // Cohort-4 cycle 2 — substrate opaque TenantId.Value added by signal-bridge cohort-4 PR 2.
  // Use for defense-in-depth tenant assertion in AuditEventDetailPage:
  //   compare tenant_id !== activeTenantId (substrate-substrate; not ERPNext display name).
  tenant_id: string
  payload_summary: Record<string, unknown>
  signature_state: SignatureState
}

// AuditEventDetail is the same wire shape as AuditEventSummary — the detail
// endpoint returns the same AuditEventDto (7 fields as of cohort-4 PR 2).
// See signal-bridge AuditEventsDtos.cs for the canonical field list.
// Forward-watch: signatures surface will be added when Engineer ships IOperationVerifier.
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

// Cohort-4 cycle 2 — Bridge returns 400 invalid_severity when an unrecognised
// severity is sent (added by signal-bridge cohort-4 PR 2). Callers should
// render an inline error rather than a tenant-reload banner.
export class InvalidSeverityError extends Error {
  readonly cause = 'invalid_severity' as const
  constructor(severity: string) {
    super(`Unknown severity filter: ${severity}`)
    this.name = 'InvalidSeverityError'
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
      // Cohort-4 cycle 2 — severity is now a server-side filter. Bridge accepts
      // Security | Financial | Messaging | Authentication | Maintenance and returns
      // 400 invalid_severity for any other value. Client re-validates against
      // the AuditEventFilters type so unknown values shouldn't reach here; the 400
      // handler below is a defense-in-depth backstop.
      if (filters.severity) params.append('severity', filters.severity)
      // G1 — cursor passed verbatim; no URL re-encoding, no JSON-parse
      if (pageParam) params.append('cursor', pageParam)

      const response = await fetch(`/api/v1/audit-events?${params}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      // G1 — 400 handling: Bridge returns RFC 7807 ProblemDetails; error code is in `title`.
      if (response.status === 400) {
        const body = await response.json().catch(() => ({}))
        if (body.title === 'tenant_changed_reload_page') {
          throw new TenantChangedError()
        }
        // Cohort-4 cycle 2 — invalid_severity: render inline error, not a tenant reload.
        if (body.title === 'invalid_severity') {
          throw new InvalidSeverityError(filters.severity ?? '')
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
