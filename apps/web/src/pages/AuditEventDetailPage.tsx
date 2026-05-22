import { useParams, Link } from 'react-router-dom'
import { useAuditEventDetail, type AuditEventDetail, type SignatureState } from '@/api/audit-events'
import { Badge } from '@/components/ui/badge'
import { ErrorCard } from '@/components/ErrorCard'
import { LoadingState } from '@/components/LoadingState'

// Route: /audit-trail/:auditId
// A1-NOTE: Client-side tenant assertion (defense-in-depth) is deferred until
// /api/v1/whoami exposes a tenantId mapping. The server is the security
// boundary (ADR 0092); the assertion requires substrate-to-substrate comparison
// that is not yet available on the wire. Forward-watch filed with Admiral.

export function AuditEventDetailPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { data: detail, error, isPending } = useAuditEventDetail(auditId!)

  if (isPending) return <LoadingState label="Loading audit event..." />
  if (error) return <ErrorCard title="Failed to load audit event" message={(error as Error).message} />
  if (!detail) return null

  return (
    <div className="space-y-6">
      {/* Nit 7 — use <Link> instead of <button onClick={navigate}> */}
      <Link to="/audit-trail" className="inline-block text-sm text-blue-600 hover:underline">
        ← Audit trail
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{detail.event_type}</h1>
        <p className="mt-1 font-mono text-xs text-gray-500">{detail.audit_id}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-medium text-gray-500">Occurred at</dt>
        <dd className="text-gray-900">
          {new Date(detail.occurred_at).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'long',
          })}
        </dd>

        <dt className="font-medium text-gray-500">Actor</dt>
        <dd className="text-gray-900">{detail.actor ?? '—'}</dd>

        <dt className="font-medium text-gray-500">Signature</dt>
        <dd>
          <SignatureBadge state={detail.signature_state} />
        </dd>

        {detail.correlation_id && (
          <>
            <dt className="font-medium text-gray-500">Correlation ID</dt>
            <dd className="font-mono text-gray-900">{detail.correlation_id}</dd>
          </>
        )}
      </dl>

      {/* A1 — structured payload render per event type */}
      <EventPayload detail={detail} />

      {/* Attesting signatures — forward-watch: Engineer to surface IOperationVerifier
          attestation data on AuditEventDto. SignatureState is available now
          (rendered above via SignatureBadge); the full attesting-signer list
          surfaces in a follow-on Engineer PR. */}
      {detail.signature_state === 'Verified' && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Attesting signatures</h2>
          <p className="text-xs text-gray-500">
            Signature verification surface pending substrate ship (IOperationVerifier, cohort-5+).
          </p>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EventPayload — A1: structured render per event type; NOT raw JSON dump
// ---------------------------------------------------------------------------

function EventPayload({ detail }: { detail: AuditEventDetail }) {
  // A1 — payload fields are in payload_summary (server field: PayloadSummary).
  // There is no top-level `payload` on the wire; see signal-bridge AuditEventDto.
  const payload = detail.payload_summary
  if (detail.event_type === 'Security.TenantBoundaryViolation') {
    return <TenantBoundaryViolationPayload payload={payload} />
  }
  if (detail.event_type === 'Security.AuthenticationFailed') {
    return <AuthenticationFailedPayload payload={payload} />
  }
  // Catch-all for known and future event types — render as labeled field list
  return <UnknownPayloadRender eventType={detail.event_type} payload={payload} />
}

// A1 — Canonical 5-field structured render for TenantBoundaryViolation
// Field names match ADR 0094 contract exactly; no JSON.stringify dump
function TenantBoundaryViolationPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h2 className="font-semibold text-red-800">Cross-tenant boundary violation</h2>
      <p className="mt-1 text-xs text-red-600">
        A request was made for a resource belonging to a different tenant.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="font-medium text-red-700">Entity type</dt>
        <dd className="text-red-900">{String(payload['entity_type'] ?? '—')}</dd>

        <dt className="font-medium text-red-700">Entity ID</dt>
        <dd className="font-mono text-red-900">{String(payload['entity_id'] ?? '—')}</dd>

        <dt className="font-medium text-red-700">Requested tenant</dt>
        <dd className="font-mono text-red-900">{String(payload['requested_tenant'] ?? '—')}</dd>

        <dt className="font-medium text-red-700">Actual tenant</dt>
        <dd className="font-mono text-red-900">{String(payload['actual_tenant'] ?? '—')}</dd>

        <dt className="font-medium text-red-700">Correlation ID</dt>
        <dd className="font-mono text-red-900">{String(payload['correlation_id'] ?? '—')}</dd>
      </dl>
    </section>
  )
}

function AuthenticationFailedPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-800">Authentication failure</h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {payload['ip'] !== undefined && (
          <>
            <dt className="font-medium text-amber-700">IP address</dt>
            <dd className="font-mono text-amber-900">{String(payload['ip'])}</dd>
          </>
        )}
        {payload['attempt_count'] !== undefined && (
          <>
            <dt className="font-medium text-amber-700">Attempt count</dt>
            <dd className="text-amber-900">{String(payload['attempt_count'])}</dd>
          </>
        )}
      </dl>
    </section>
  )
}

function UnknownPayloadRender({
  eventType,
  payload,
}: {
  eventType: string
  payload: Record<string, unknown>
}) {
  const entries = Object.entries(payload)
  if (entries.length === 0) return null

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h2 className="font-semibold text-gray-700">{eventType} payload</h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {entries.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="font-medium text-gray-500">{key}</dt>
            <dd className="font-mono text-gray-900 break-all">{JSON.stringify(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// ---------------------------------------------------------------------------
// SignatureBadge
// ---------------------------------------------------------------------------

function SignatureBadge({ state }: { state: SignatureState }) {
  if (state === 'Verified') return <Badge variant="success">✓ Verified</Badge>
  if (state === 'VerificationFailed') return <Badge variant="destructive">⚠ Failed</Badge>
  return <Badge variant="outline">— Not signed</Badge>
}
