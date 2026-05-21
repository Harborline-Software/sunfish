/**
 * Cohort-4 C3 Audit-Trail Viewer — TypeScript type contract
 *
 * Types-only stub. No fetch functions — Engineer's Bridge endpoint family
 * (GET /api/v1/audit-events) must ship first; client functions land in FED PR 1.
 *
 * Wire contract source: Stage-06 hand-off (shipyard icm/_state/handoffs/
 * cohort-4-c3-audit-trail-viewer-stage06-handoff.md §5.1)
 */

// ---------------------------------------------------------------------------
// Signature verification state
// ---------------------------------------------------------------------------

export type SignatureState = 'Verified' | 'VerificationFailed' | 'NotSigned'

// ---------------------------------------------------------------------------
// Audit event shapes
// ---------------------------------------------------------------------------

/**
 * Summary row returned by GET /api/v1/audit-events (list endpoint).
 * payload_summary is a server-selected subset of the full payload.
 */
export interface AuditEventSummary {
  audit_id: string
  occurred_at: string             // ISO 8601 UTC
  event_type: string              // AuditEventType enum value (e.g. "Messaging.MessageDispatched")
  actor: string | null            // Username or system identity that triggered the event
  correlation_id: string | null   // NULL for pre-retrofit events (cohort-4 Decision 3)
  payload_summary: Record<string, unknown>
  signature_state: SignatureState
}

/**
 * Full record returned by GET /api/v1/audit-events/{auditId} (detail endpoint).
 * Extends summary with full payload + all signatures.
 */
export interface AuditEventDetail extends AuditEventSummary {
  payload: Record<string, unknown>        // Full payload; PII fields masked server-side when tagged
  signatures: AttestingSignature[]
}

/**
 * Ed25519 signature envelope (ADR 0046 / ADR 0049).
 * signature is base64-encoded.
 */
export interface AttestingSignature {
  signer_id: string
  algorithm: string               // e.g. "Ed25519"
  signed_at: string               // ISO 8601 UTC
  signature: string               // base64-encoded
}

// ---------------------------------------------------------------------------
// Paginated list response
// ---------------------------------------------------------------------------

/**
 * Response from GET /api/v1/audit-events.
 * next_cursor is null when has_more = false.
 * Cursors are opaque, signed server-side (Decision 2 — tenant_id_signature embedded).
 */
export interface AuditEventsPage {
  events: AuditEventSummary[]
  next_cursor: string | null
  has_more: boolean
}

// ---------------------------------------------------------------------------
// Query / filter parameters
// ---------------------------------------------------------------------------

/**
 * Filter parameters for the list and CSV-export endpoints.
 * All optional; server applies defaults (to = now, from = to - 30 days).
 *
 * Server rejects:
 *   from > to → 400 "inverted_range"
 *   range > 1 year → 400 "range_too_large"
 *   event_type not in AuditEventType enum → 400 "invalid_event_type"
 *   tenant_id query param present → 400 "tenant_id_not_caller_supplied" + TBV audit emission
 */
export interface AuditEventsQuery {
  from?: string           // ISO date (YYYY-MM-DD)
  to?: string             // ISO date (YYYY-MM-DD)
  eventType?: string      // AuditEventType enum string; omit = all types
  correlationId?: string  // GUID; if present, ignores from/to
  pageSize?: number       // default 50; max 200
  cursor?: string         // opaque cursor from prior AuditEventsPage.next_cursor
}

// ---------------------------------------------------------------------------
// Known AuditEventType constants (informational; canonical list lives in .NET)
// ---------------------------------------------------------------------------

/**
 * Non-exhaustive list of known event types.
 * Add entries as new audit sources are introduced.
 * FED uses this for the event_type filter dropdown options.
 */
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
