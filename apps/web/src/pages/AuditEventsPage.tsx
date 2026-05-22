import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAuditEvents,
  TenantChangedError,
  KNOWN_AUDIT_EVENT_TYPES,
  type AuditEventFilters,
  type AuditEventSummary,
  type SignatureState,
} from '@/api/audit-events'
import { Badge } from '@/components/ui/badge'
import { ErrorCard } from '@/components/ErrorCard'
import { LoadingState } from '@/components/LoadingState'

// ---------------------------------------------------------------------------
// AuditEventsPage
// ---------------------------------------------------------------------------

export function AuditEventsPage() {
  const [filters, setFilters] = useState<AuditEventFilters>({})
  const queryClient = useQueryClient()
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useAuditEvents(filters)

  // G1 — 400 tenant_changed: discard stale cursor pages; restart from page 1
  useEffect(() => {
    if (error instanceof TenantChangedError) {
      queryClient.resetQueries({ queryKey: ['audit-events'] })
    }
  }, [error, queryClient])

  if (isPending) return <LoadingState label="Loading audit events..." />
  if (error instanceof TenantChangedError) return <LoadingState label="Session changed. Reloading..." />
  if (error) {
    return (
      <ErrorCard
        title="Failed to load audit events"
        message={(error as Error).message}
        onRetry={refetch}
      />
    )
  }

  const allEvents = data?.pages.flatMap((page) => page.events) ?? []
  // A2 — client-side severity filter. The Bridge endpoint does not accept a
  // `severity` query param; filtering is applied post-fetch against the loaded
  // pages. Forward-watch: Engineer to add server-side severity filter in cohort-5+.
  const events = filters.severity
    ? allEvents.filter((e) => e.event_type.startsWith(filters.severity + '.'))
    : allEvents

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Immutable record of all system events for this account
          </p>
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm" aria-label="Audit events">
          {/* Nit 3 — sticky thead for long lists */}
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Audit ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Occurred at
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Event type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Actor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Signature
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No audit events match the current filters.
                </td>
              </tr>
            )}
            {events.map((ev) => (
              <EventRow key={ev.audit_id} event={ev} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Nit 2 — hide Load more entirely when next_cursor === null */}
      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more ↓'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EventRow — A2: Security.* rows get red-tinted bg + SECURITY badge
// ---------------------------------------------------------------------------

function EventRow({ event }: { event: AuditEventSummary }) {
  const navigate = useNavigate()
  const isSecurityEvent = event.event_type.startsWith('Security.')

  const rowClass = isSecurityEvent
    ? 'cursor-pointer bg-red-50 hover:bg-red-100'
    : 'cursor-pointer hover:bg-gray-50'

  const eventTypeCellClass = isSecurityEvent ? 'font-mono text-xs text-red-700' : 'font-mono text-xs text-gray-700'

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={`Audit event ${event.audit_id.slice(-8)} — ${event.event_type}`}
      className={rowClass}
      onClick={() => navigate(`/audit-trail/${event.audit_id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/audit-trail/${event.audit_id}`)
      }}
    >
      <td className="px-4 py-3 font-mono text-xs text-gray-700">
        {event.audit_id.slice(-8).toUpperCase()}
      </td>
      <td className="px-4 py-3 text-gray-700">
        {new Date(event.occurred_at).toLocaleString('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </td>
      <td className={`px-4 py-3 ${eventTypeCellClass}`}>
        <span className="inline-flex items-center gap-1.5">
          {event.event_type}
          {/* A2 — color-blind safety: pair red background with text badge */}
          {isSecurityEvent && (
            <Badge variant="destructive" className="text-xs">
              SECURITY
            </Badge>
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500">{event.actor ?? '—'}</td>
      <td className="px-4 py-3">
        {/* Nit 1 — canonical <Badge> from @/components/ui/badge */}
        <SignatureBadge state={event.signature_state} />
      </td>
    </tr>
  )
}

function SignatureBadge({ state }: { state: SignatureState }) {
  if (state === 'Verified') return <Badge variant="success">✓ Verified</Badge>
  if (state === 'VerificationFailed') return <Badge variant="destructive">⚠ Failed</Badge>
  return <Badge variant="outline">— Not signed</Badge>
}

// ---------------------------------------------------------------------------
// FilterBar — Nit 4: htmlFor/id; Nit 5: no-op Filter button removed
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters: AuditEventFilters
  onChange: (f: AuditEventFilters) => void
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActive = Boolean(
    filters.from || filters.to || filters.eventType || filters.correlationId || filters.severity
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="audit-filter-from" className="block text-xs font-medium text-gray-600">
            From
          </label>
          <input
            id="audit-filter-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
            className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="audit-filter-to" className="block text-xs font-medium text-gray-600">
            To
          </label>
          <input
            id="audit-filter-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
            className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="audit-filter-event-type" className="block text-xs font-medium text-gray-600">
            Event type
          </label>
          <select
            id="audit-filter-event-type"
            value={filters.eventType ?? ''}
            onChange={(e) => onChange({ ...filters, eventType: e.target.value || undefined })}
            className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {KNOWN_AUDIT_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {/* A2 — severity filter */}
        <div>
          <label htmlFor="audit-filter-severity" className="block text-xs font-medium text-gray-600">
            Severity
          </label>
          <select
            id="audit-filter-severity"
            value={filters.severity ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                severity: (e.target.value as AuditEventFilters['severity']) || undefined,
              })
            }
            className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All severities</option>
            <option value="Security">Security only</option>
            <option value="Financial">Financial only</option>
            <option value="Messaging">Messaging only</option>
            <option value="Authentication">Authentication only</option>
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="audit-filter-correlation" className="block text-xs font-medium text-gray-600">
            Correlation ID
          </label>
          <input
            id="audit-filter-correlation"
            type="text"
            value={filters.correlationId ?? ''}
            onChange={(e) => onChange({ ...filters, correlationId: e.target.value || undefined })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm"
          />
        </div>
        {/* Nit 5 — no-op Filter button removed; state is reactive via onChange */}
        {hasActive && (
          <button
            onClick={() => onChange({})}
            className="text-sm text-gray-500 underline hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
