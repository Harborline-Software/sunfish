import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import type { ProjectStatus, ProjectKind, CreateProjectInput } from '@/api/projects'

/**
 * PM pilot — /cockpit/projects list page.
 * Routes: new route → pattern-009 sec-eng SPOT-CHECK required on PR-open.
 */

const STATUS_COLORS: Record<string, string> = {
  Draft:      'bg-gray-100 text-gray-700',
  Planned:    'bg-blue-100 text-blue-700',
  InProgress: 'bg-amber-100 text-amber-700',
  OnHold:     'bg-orange-100 text-orange-700',
  Blocked:    'bg-red-100 text-red-700',
  Completed:  'bg-green-100 text-green-700',
  Closed:     'bg-gray-200 text-gray-600',
  Cancelled:  'bg-red-50 text-red-400',
}

const ALL_STATUSES: ProjectStatus[] = [
  'Draft', 'Planned', 'InProgress', 'OnHold', 'Blocked', 'Completed', 'Closed', 'Cancelled',
]

const ALL_KINDS: ProjectKind[] = [
  'General', 'Renovation', 'Maintenance', 'Capital', 'Lease',
]

export function ProjectListView() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [kindFilter, setKindFilter] = useState<ProjectKind | ''>('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isPending, isError, error, refetch } = useProjects()
  const createMutation = useCreateProject()

  const items = data?.items ?? []
  const filtered = items.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false
    if (kindFilter && p.kind !== kindFilter) return false
    return true
  })

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input: CreateProjectInput = {
      name: String(fd.get('name') ?? ''),
      code: String(fd.get('code') ?? ''),
      kind: (fd.get('kind') as ProjectKind) ?? 'General',
      plannedStart: (fd.get('plannedStart') as string) || null,
      plannedEnd: (fd.get('plannedEnd') as string) || null,
      description: (fd.get('description') as string) || null,
      // ownerPartyId NOT included — session-derived server side
    }
    createMutation.mutate(input, {
      onSuccess: () => setShowCreate(false),
    })
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">
            {data ? `${filtered.length} of ${data.total} projects` : ' '}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600" htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="text-sm text-gray-600" htmlFor="kind-filter">Kind</label>
          <select
            id="kind-filter"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as ProjectKind | '')}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {ALL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            New project
          </button>
        </div>
      </header>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">New project</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600" htmlFor="proj-name">Name *</label>
              <input id="proj-name" name="name" required className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600" htmlFor="proj-code">Code *</label>
              <input id="proj-code" name="code" required className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600" htmlFor="proj-kind">Kind</label>
              <select id="proj-kind" name="kind" className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
                {ALL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600" htmlFor="proj-start">Planned start</label>
              <input id="proj-start" name="plannedStart" type="date" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600" htmlFor="proj-end">Planned end</label>
              <input id="proj-end" name="plannedEnd" type="date" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600" htmlFor="proj-desc">Description</label>
              <textarea id="proj-desc" name="description" rows={2} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              {createMutation.isError && (
                <p className="text-sm text-red-600">
                  {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create'}
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {isPending ? (
        <p className="text-gray-500">Loading projects…</p>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">Failed to load projects</p>
          <p className="mt-1 text-sm text-gray-600">{error instanceof Error ? error.message : String(error)}</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No projects match this filter.</p>
      ) : (
        <table className="w-full overflow-hidden rounded border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.code}</td>
                <td className="px-3 py-2 font-medium">
                  <Link
                    to={`/cockpit/projects/${encodeURIComponent(p.id)}`}
                    className="text-blue-600 hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-600">{p.kind}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
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
