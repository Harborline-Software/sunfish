/**
 * Project time-entry + approval panel.
 * Role-gated UI: the approve/reject controls are visible only to users with an
 * approver role. The Bridge enforces authority (§5 of Stage-05 hand-off) — this
 * panel is a UI affordance, not the authorization gate.
 *
 * sec-eng note (Stage-05 §8): self-approval prohibited server side;
 * the Bridge rejects approve/reject where approverPartyId == submitting worker.
 * approverPartyId is NEVER sent in the request body — session-derived.
 */
import { useProjectTimeEntries, useTimeLifecycle, useApproveTimeEntry, useRejectTimeEntry } from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import type { TimeApprovalInput } from '@/api/projects'

interface Props {
  projectId: string
}

export function ProjectTimePanel({ projectId }: Props) {
  const { data, isPending, isError, error, refetch } = useProjectTimeEntries(projectId)
  const openMutation = useTimeLifecycle(projectId)
  const approveMutation = useApproveTimeEntry(projectId)
  const rejectMutation = useRejectTimeEntry(projectId)

  // Role-gated UI — approver controls render only for 'owner' and 'manager' roles.
  // Bridge is the ACTUAL auth gate; UI is purely UX affordance.
  const role = useAuthStore((s) => s.role)
  const canApprove = role === 'owner' || role === 'manager'

  function handleOpenEntry() {
    openMutation.mutate(
      { action: 'open' },
      // hourlyRate NOT sent on open — only on stop, and only by rate-authorized role
    )
  }

  function handleApprove(timeEntryId: string) {
    const input: TimeApprovalInput = {}
    // approverPartyId NOT in body — session-derived by Bridge
    approveMutation.mutate({ timeEntryId, input })
  }

  function handleReject(timeEntryId: string) {
    const input: TimeApprovalInput = {}
    rejectMutation.mutate({ timeEntryId, input })
  }

  if (isPending) return <p className="text-sm text-gray-500">Loading time entries…</p>
  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load time entries'}</p>
        <button onClick={() => void refetch()} className="mt-2 text-xs text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Time entries ({data?.total ?? 0})</h3>
        <button
          onClick={handleOpenEntry}
          disabled={openMutation.isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {openMutation.isPending ? 'Opening…' : 'Start timer'}
        </button>
      </div>

      {openMutation.isError && (
        <p className="mb-2 text-xs text-red-600">{openMutation.error instanceof Error ? openMutation.error.message : 'Failed to start timer'}</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No time entries yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((entry) => {
            const durationHrs = entry.durationMinutes != null
              ? (entry.durationMinutes / 60).toFixed(1)
              : null
            const amount = (entry.durationMinutes != null && entry.hourlyRate != null)
              ? ((entry.durationMinutes / 60) * entry.hourlyRate).toFixed(2)
              : null

            return (
              <li key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    <span className="font-mono text-xs text-gray-500">{entry.id.slice(-8)}</span>
                    {' · '}
                    <span className={`rounded px-1.5 py-0.5 text-xs ${
                      entry.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                      entry.status === 'Submitted' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{entry.status}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    started {new Date(entry.openedAt).toLocaleString()}
                    {durationHrs ? ` · ${durationHrs}h` : ''}
                    {entry.hourlyRate ? ` · $${entry.hourlyRate}/hr` : ''}
                    {amount ? ` · $${amount}` : ''}
                    {entry.submittedAt ? ` · submitted ${new Date(entry.submittedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                {/* Approval queue — role-gated UI only */}
                {canApprove && entry.status === 'Submitted' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(entry.id)}
                      disabled={approveMutation.isPending}
                      className="rounded border border-green-300 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(entry.id)}
                      disabled={rejectMutation.isPending}
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
