import { useState } from 'react'
import { useProjectMilestones, useAddMilestone, useAchieveMilestone } from '@/hooks/useProjects'
import type { AddMilestoneInput, MilestoneKind } from '@/api/projects'

const MILESTONE_KINDS: MilestoneKind[] = ['Phase', 'Deliverable', 'Review', 'Gate']

const STATUS_COLORS: Record<string, string> = {
  Pending:  'bg-amber-100 text-amber-700',
  Achieved: 'bg-green-100 text-green-700',
  Missed:   'bg-red-100 text-red-700',
}

interface Props {
  projectId: string
}

export function ProjectMilestonesPanel({ projectId }: Props) {
  const { data, isPending, isError, error, refetch } = useProjectMilestones(projectId)
  const addMutation = useAddMilestone(projectId)
  const achieveMutation = useAchieveMilestone(projectId)
  const [showAdd, setShowAdd] = useState(false)

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input: AddMilestoneInput = {
      name: String(fd.get('name') ?? ''),
      code: String(fd.get('code') ?? ''),
      kind: (fd.get('kind') as MilestoneKind) ?? 'Phase',
      plannedDate: (fd.get('plannedDate') as string) || null,
    }
    addMutation.mutate(input, { onSuccess: () => setShowAdd(false) })
  }

  function handleAchieve(milestoneId: string) {
    const actualDate = new Date().toISOString().slice(0, 10) // yyyy-MM-dd
    achieveMutation.mutate({ milestoneId, input: { actualDate } })
  }

  if (isPending) return <p className="text-sm text-gray-500">Loading milestones…</p>
  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load milestones'}</p>
        <button onClick={() => void refetch()} className="mt-2 text-xs text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }

  const milestones = data?.milestones ?? []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Milestones ({milestones.length})</h3>
        <button onClick={() => setShowAdd((v) => !v)} className="text-xs text-blue-600 hover:underline">
          Add milestone
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Name *</label>
              <input name="name" required className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Code *</label>
              <input name="code" required className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Kind</label>
              <select name="kind" className="w-full rounded border border-gray-300 px-2 py-1 text-xs">
                {MILESTONE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Planned date</label>
              <input name="plannedDate" type="date" className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <button type="submit" disabled={addMutation.isPending} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                {addMutation.isPending ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-gray-500">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="text-sm text-gray-500">No milestones yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {milestones.map((ms) => (
            <li key={ms.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{ms.name}</p>
                <p className="text-xs text-gray-500">
                  {ms.code} · {ms.kind}
                  {ms.plannedDate ? ` · planned ${ms.plannedDate}` : ''}
                  {ms.actualDate ? ` · achieved ${ms.actualDate}` : ''}
                  {ms.predecessorMilestoneId ? ' · has predecessor' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ms.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ms.status}
                </span>
                {ms.status === 'Pending' && (
                  <button
                    onClick={() => handleAchieve(ms.id)}
                    disabled={achieveMutation.isPending}
                    className="rounded border border-green-300 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    Mark achieved
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
