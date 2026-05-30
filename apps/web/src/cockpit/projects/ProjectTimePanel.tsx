/**
 * Time panel — PM pilot.
 *
 * Role-gated UI:
 *   - Worker (role !== 'approver'): Start Timer form + per-row Stop / Submit affordances.
 *   - Approver (role === 'approver'): per-row Approve / Reject affordances for Submitted entries.
 *   Frontend enforcement is defense-in-depth; Bridge enforces all gates independently.
 *
 * A3 resolution: Bridge gates approve/reject via HasPermission('time:approve').
 *   'approver' role is the frontend sentinel; demo seed concern, not a code defect.
 *
 * Self-approval/self-stop prohibition: Bridge rejects where the acting party equals the
 *   originating worker's party-id. UI cannot enforce this (TimeEntry read shape omits
 *   workerPartyId — negative-match discipline). Trust Bridge enforcement.
 */
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  useProjectTimeEntries,
  useOpenTimeEntry, useStopTimeEntry, useSubmitTimeEntry,
  useApproveTimeEntry, useRejectTimeEntry,
} from '@/hooks/useProjects'
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

  // Approver state
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Worker start-timer state
  const [showStartForm, setShowStartForm] = useState(false)
  const [activityKind, setActivityKind] = useState('')
  const [startDescription, setStartDescription] = useState('')

  const { data, isPending, isError, error } = useProjectTimeEntries(projectId)
  const openMutation = useOpenTimeEntry(projectId)
  const stopMutation = useStopTimeEntry(projectId)
  const submitMutation = useSubmitTimeEntry(projectId)
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

  const handleStartTimer = () => {
    if (!activityKind.trim()) return
    openMutation.mutate(
      {
        activityKind: activityKind.trim(),
        startedAt: new Date().toISOString(),
        ...(startDescription.trim() ? { description: startDescription.trim() } : {}),
      },
      {
        onSuccess: () => {
          setShowStartForm(false)
          setActivityKind('')
          setStartDescription('')
        },
      },
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Time</h2>
        {!canApprove && !showStartForm && (
          <button
            onClick={() => setShowStartForm(true)}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            aria-label="Start timer"
          >
            Start Timer
          </button>
        )}
      </div>

      {!canApprove && showStartForm && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Activity *</label>
            <input
              type="text"
              value={activityKind}
              onChange={(e) => setActivityKind(e.target.value)}
              placeholder="e.g. Labor"
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
              aria-label="Activity kind"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Description</label>
            <input
              type="text"
              value={startDescription}
              onChange={(e) => setStartDescription(e.target.value)}
              placeholder="Optional"
              className="w-44 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
              aria-label="Start description"
            />
          </div>
          <button
            onClick={handleStartTimer}
            disabled={openMutation.isPending || !activityKind.trim()}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {openMutation.isPending ? 'Starting…' : 'Start'}
          </button>
          <button
            onClick={() => { setShowStartForm(false); setActivityKind(''); setStartDescription('') }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {data.entries.length === 0 ? (
        <p className="py-4 text-sm text-gray-500">No time entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4 font-medium">Description</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Started</th>
              <th className="pb-2 pr-4 font-medium">Ended</th>
              <th className="pb-2 pr-4 font-medium">Rate</th>
              <th className="pb-2 font-medium">Actions</th>
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
                <td className="py-2">
                  {!canApprove && entry.status === 'Open' && (
                    <button
                      onClick={() =>
                        stopMutation.mutate({ entryId: entry.id, endedAt: new Date().toISOString() })
                      }
                      disabled={stopMutation.isPending}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      aria-label="Stop time entry"
                    >
                      Stop
                    </button>
                  )}
                  {!canApprove && entry.status === 'Stopped' && (
                    <button
                      onClick={() => submitMutation.mutate(entry.id)}
                      disabled={submitMutation.isPending}
                      className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      aria-label="Submit time entry"
                    >
                      Submit
                    </button>
                  )}
                  {canApprove && entry.status === 'Submitted' && rejectingId !== entry.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveMutation.mutate({ entryId: entry.id })}
                        disabled={approveMutation.isPending}
                        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        aria-label="Approve time entry"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectingId(entry.id); setRejectReason('') }}
                        disabled={rejectMutation.isPending}
                        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label="Reject time entry"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {canApprove && rejectingId === entry.id && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection"
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-red-400 focus:outline-none"
                        aria-label="Rejection reason"
                      />
                      <button
                        onClick={() => {
                          if (!rejectReason.trim()) return
                          rejectMutation.mutate(
                            { entryId: entry.id, input: { reason: rejectReason.trim() } },
                            { onSettled: () => { setRejectingId(null); setRejectReason('') } },
                          )
                        }}
                        disabled={rejectMutation.isPending || !rejectReason.trim()}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
