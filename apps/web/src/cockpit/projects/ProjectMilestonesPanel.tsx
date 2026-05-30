/**
 * Milestones panel — PM pilot.
 *
 * Named render invariants (test-eng F11):
 *   (a) milestone rows render in the correct order (as returned by the Bridge)
 *   (b) predecessor edges are visually indicated when predecessorMilestoneId is non-null
 *   (c) achieved milestones are distinguished from pending milestones
 */
import { useProjectMilestones } from '@/hooks/useProjects'

interface Props {
  projectId: string
}

const ACHIEVED_STATUSES = new Set(['Achieved', 'Completed', 'Done'])

function isAchieved(status: string): boolean {
  return ACHIEVED_STATUSES.has(status)
}

export function ProjectMilestonesPanel({ projectId }: Props) {
  const { data, isPending, isError, error } = useProjectMilestones(projectId)

  if (isPending) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading milestones…</p>
  }

  if (isError) {
    return (
      <p className="py-4 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Failed to load milestones'}
      </p>
    )
  }

  if (!data) return null

  if (data.milestones.length === 0) {
    return <p className="py-4 text-sm text-gray-500">No milestones yet.</p>
  }

  const idToCode = Object.fromEntries(data.milestones.map((m) => [m.id, m.code]))

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-gray-900">Milestones</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="pb-2 pr-4 font-medium">Code</th>
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Planned</th>
            <th className="pb-2 font-medium">Predecessor</th>
          </tr>
        </thead>
        <tbody>
          {data.milestones.map((m) => (
            <tr
              key={m.id}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="py-2 pr-4 font-mono text-xs text-gray-500">{m.code}</td>
              <td className={`py-2 pr-4 ${isAchieved(m.status) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {m.name}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    isAchieved(m.status)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {m.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-500">{m.plannedDate ?? '—'}</td>
              <td className="py-2 text-gray-500">
                {m.predecessorMilestoneId ? (
                  <span
                    title={`Depends on ${idToCode[m.predecessorMilestoneId] ?? m.predecessorMilestoneId}`}
                    aria-label={`depends on ${idToCode[m.predecessorMilestoneId] ?? m.predecessorMilestoneId}`}
                    className="text-xs text-blue-600"
                  >
                    → {idToCode[m.predecessorMilestoneId] ?? m.predecessorMilestoneId.slice(-6)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
