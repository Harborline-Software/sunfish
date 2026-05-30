import { Link } from 'react-router-dom'
import { useProjects } from '@/hooks/useProjects'
import type { ProjectStatus } from '@/api/projects'

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Draft:      'bg-gray-100 text-gray-700',
  Planned:    'bg-blue-100 text-blue-700',
  InProgress: 'bg-amber-100 text-amber-700',
  OnHold:     'bg-yellow-100 text-yellow-700',
  Blocked:    'bg-red-100 text-red-700',
  Completed:  'bg-green-100 text-green-700',
  Closed:     'bg-gray-200 text-gray-600',
  Cancelled:  'bg-red-50 text-red-500',
}

export function ProjectListView() {
  const { data, isPending, isError, error, refetch } = useProjects()

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.projects.length} project${data.projects.length === 1 ? '' : 's'}` : ' '}
          </p>
        </div>
      </header>

      {isPending && (
        <p className="py-8 text-center text-sm text-gray-500">Loading projects…</p>
      )}

      {isError && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Failed to load projects</p>
          <p className="mt-1">{error instanceof Error ? error.message : String(error)}</p>
          <button
            onClick={() => void refetch()}
            className="mt-2 text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {data && data.projects.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">No projects yet.</p>
      )}

      {data && data.projects.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4 font-medium">Code</th>
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Kind</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="py-3 pr-4 font-mono text-xs text-gray-500">{p.code}</td>
                <td className="py-3 pr-4">
                  <Link
                    to={`/cockpit/projects/${encodeURIComponent(p.id)}`}
                    className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-gray-500">{p.kind}</td>
                <td className="py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
