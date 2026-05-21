import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Types — inline until sunfish#58 (audit-events.ts) merges into main
// ---------------------------------------------------------------------------

type SignatureState = 'Verified' | 'VerificationFailed' | 'NotSigned'

interface AuditEventSummary {
  audit_id: string
  occurred_at: string
  event_type: string
  actor: string | null
  correlation_id: string | null
  payload_summary: Record<string, unknown>
  signature_state: SignatureState
}

const KNOWN_AUDIT_EVENT_TYPES = [
  'Messaging.MessageDispatched',
  'Messaging.MessageFailed',
  'Financial.InvoicePosted',
  'Financial.PaymentRecorded',
  'Financial.JournalPosted',
  'Security.TenantBoundaryViolation',
  'Security.AuthenticationFailed',
] as const

// ---------------------------------------------------------------------------
// Mock data — replaced by Bridge GET /api/v1/audit-events once Engineer PR 0 ships
// ---------------------------------------------------------------------------

const MOCK_EVENTS: AuditEventSummary[] = [
  {
    audit_id: '01HZ4KW2P3RQNVT8X6J0M5CDEF',
    occurred_at: '2026-05-21T18:32:11Z',
    event_type: 'Messaging.MessageDispatched',
    actor: 'system',
    correlation_id: '7a3f2c11-9b4e-4d8a-bc91-1234567890ab',
    payload_summary: { message_id: 'msg-ulid-aaa001', channel: 'email' },
    signature_state: 'Verified',
  },
  {
    audit_id: '01HZ4KW2P3RQNVT8X6J0M5ABCD',
    occurred_at: '2026-05-21T17:15:44Z',
    event_type: 'Financial.InvoicePosted',
    actor: 'admin@sunfish.local',
    correlation_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    payload_summary: { invoice_name: 'INV-2026-05-21-0001-0001', amount: 2400 },
    signature_state: 'Verified',
  },
  {
    audit_id: '01HZ4KW2P3RQNVT8X6J0M5WXYZ',
    occurred_at: '2026-05-21T16:02:07Z',
    event_type: 'Financial.PaymentRecorded',
    actor: 'admin@sunfish.local',
    correlation_id: null,
    payload_summary: { amount: 1800, payment_method: 'ACH' },
    signature_state: 'NotSigned',
  },
  {
    audit_id: '01HZ4KW2P3RQNVT8X6J0M5LMNO',
    occurred_at: '2026-05-21T14:48:30Z',
    event_type: 'Security.AuthenticationFailed',
    actor: null,
    correlation_id: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
    payload_summary: { ip: '203.0.113.42', attempt_count: 3 },
    signature_state: 'VerificationFailed',
  },
  {
    audit_id: '01HZ4KW2P3RQNVT8X6J0M5PQRS',
    occurred_at: '2026-05-21T09:11:55Z',
    event_type: 'Financial.JournalPosted',
    actor: 'admin@sunfish.local',
    correlation_id: '11223344-5566-7788-99aa-bbccddeeff00',
    payload_summary: { journal_name: 'JV-2026-05-21-0001', debit_total: 5000 },
    signature_state: 'Verified',
  },
]

// ---------------------------------------------------------------------------
// SignatureBadge
// ---------------------------------------------------------------------------

function SignatureBadge({ state }: { state: SignatureState }) {
  if (state === 'Verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        ✓ Verified
      </span>
    )
  }
  if (state === 'VerificationFailed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
        ⚠ Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
      — Not signed
    </span>
  )
}

// ---------------------------------------------------------------------------
// AuditEventsPage
// ---------------------------------------------------------------------------

export function AuditEventsPage() {
  const navigate = useNavigate()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [correlationId, setCorrelationId] = useState('')

  // Filtered view against mock data — replaced by useAuditEvents hook post-Bridge
  const filtered = MOCK_EVENTS.filter((ev) => {
    if (fromDate && ev.occurred_at < fromDate) return false
    if (toDate && ev.occurred_at > toDate + 'T23:59:59Z') return false
    if (eventType && ev.event_type !== eventType) return false
    if (correlationId && ev.correlation_id !== correlationId) return false
    return true
  })

  // Mock CSV export URL — replaced by buildAuditCsvUrl() post-Bridge
  const csvHref = '#'

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Immutable record of all system events for this account
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>

      {/* Filter bar */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Event type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
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
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600">Correlation ID</label>
            <input
              type="text"
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <button
            onClick={() => {/* filter state already reactive */}}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Filter
          </button>
          {(fromDate || toDate || eventType || correlationId) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setEventType(''); setCorrelationId('') }}
              className="text-sm text-gray-500 hover:text-gray-900 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm" aria-label="Audit events">
          <thead className="bg-gray-50">
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No audit events match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((ev) => (
              <tr
                key={ev.audit_id}
                onClick={() => navigate(`/audit-trail/${ev.audit_id}`)}
                className="cursor-pointer hover:bg-gray-50"
                role="button"
                tabIndex={0}
                aria-label={`Audit event ${ev.audit_id.slice(-8)} — ${ev.event_type}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/audit-trail/${ev.audit_id}`) }}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {ev.audit_id.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {new Date(ev.occurred_at).toLocaleString('en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{ev.event_type}</td>
                <td className="px-4 py-3 text-gray-500">{ev.actor ?? '—'}</td>
                <td className="px-4 py-3">
                  <SignatureBadge state={ev.signature_state} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load more — wired to mock state; replaced by cursor pagination post-Bridge */}
      {filtered.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            disabled
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-400 ring-1 ring-inset ring-gray-300 cursor-not-allowed"
            title="Pagination available after Bridge endpoint ships"
          >
            Load more ↓
          </button>
        </div>
      )}

      {/* Mock-data notice — remove when Bridge endpoint ships */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Showing mock data — live data available after Bridge audit-events endpoint ships
      </p>
    </div>
  )
}
