import { useParams, useNavigate } from 'react-router-dom'

// Stub — replaced by real fetch + AuditEventDetail type once Bridge endpoint ships
// Route: /audit-trail/:auditId

export function AuditEventDetailPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const navigate = useNavigate()

  return (
    <div>
      <button
        onClick={() => navigate('/audit-trail')}
        className="mb-4 text-sm text-gray-500 hover:text-gray-900"
      >
        ← Back to Audit Trail
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Audit Event</h1>
      <p className="mt-1 font-mono text-xs text-gray-500">{auditId}</p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Detail view pending Bridge endpoint ship (Engineer PR 0).
        <br />
        Signature verification state, full payload, and attesting signatures will display here.
      </div>
    </div>
  )
}
