/**
 * Time panel — PM pilot.
 *
 * Role-gated approval UI (test-eng F10, sec-eng D3):
 *   - A worker (role !== 'approver') sees ZERO approval affordances.
 *   - An approver (role === 'approver') sees approve / reject buttons per submitted entry.
 *   This is a FRONTEND enforcement layer. The Bridge enforces the same gate independently
 *   (approveTimeEntry / rejectTimeEntry are also Bridge-enforced). The UI suppression is
 *   defense-in-depth: prevents social-engineering even if the Bridge gate were bypassed.
 *
 * A3 resolution (signal-bridge#63): Bridge gates approve/reject via HasPermission('time:approve').
 *   The demo SessionBackedTenantContext MUST seed 'time:approve' for the 'approver' role or
 *   #13/#14 will 403 in the demo. 'approver' is the correct frontend sentinel; this is a
 *   demo-seeding concern, not a frontend code defect.
 *
 * Self-approval prohibition: the Bridge rejects approve/reject where the approver party-id
 *   equals the submitting worker's party-id (sec-eng F4 / test-eng F2 self-approval-denied
 *   → 403). The UI cannot enforce this directly (FED has no WorkerPartyId in the
 *   TimeEntry shape — negative-match discipline). Trust Bridge enforcement for self-approval.
 */
import { useAuthStore } from '@/stores/authStore'
import { useProjectTimeEntries, useApproveTimeEntry, useRejectTimeEntry } from '@/hooks/useProjects'
import type { TimeEntryStatus } from '@/api/projects'

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  Open:      'Open',
  Stopped:   'Stopped',
  Submitted: 'Submitted',
  Approved:  'Approved',
  Rejected:  'Rejected',
}

interface Props {
  projectId: string
}

export function ProjectTimePanel({ projectId }: Props) {
  const role = useAuthStore((s) => s.role)
  const canApprove = role === 'approver'

  const { data, isPending, isError, error } = useProjectTimeEntries(projectId)
  const approveMutation = useApproveTimeEntry(projectId)
  const rejectMutation = useRejectTimeEntry(projectId)

  if (isPending) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading time entries…</p>
  }

  if (isError) {
    return (
      <p className="py-4 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Failed to load time entries'}
      </p>
    )
  }

  if (!data) return null

  if (data.entries.length === 0) {
    return <p className="py-4 text-sm text-gray-500">No time entries yet.</p>
  }

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900">Time</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="pb-2 pr-4 font-medium">Description</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Started</th>
            <th className="pb-2 pr-4 font-medium">Ended</th>
            <th className="pb-2 pr-4 font-medium">Rate</th>
            {canApprove && <th className="pb-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.entries.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 text-gray-700">{entry.description ?? '—'}</td>
              <td className="py-2 pr-4">
                <span className="text-xs text-gray-500">{STATUS_LABEL[entry.status]}</span>
              </td>
              <td className="py-2 pr-4 text-xs text-gray-500">{entry.startedAt ?? '—'}</td>
              <td className="py-2 pr-4 text-xs text-gray-500">{entry.endedAt ?? '—'}</td>
              <td className="py-2 pr-4 text-xs tabular-nums text-gray-500">
                {entry.hourlyRate != null ? `$${entry.hourlyRate}/hr` : '—'}
              </td>
              {canApprove && (
                <td className="py-2">
                  {entry.status === 'Submitted' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveMutation.mutate(entry.id)}
                        disabled={approveMutation.isPending}
                        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        aria-label={`Approve time entry`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(entry.id)}
                        disabled={rejectMutation.isPending}
                        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Reject time entry`}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
