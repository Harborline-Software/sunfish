import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
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

const EMPTY_FORM = { name: '', kind: '', priority: '', ownerPartyId: '', description: '' }

export function ProjectListView() {
  const { data, isPending, isError, error, refetch } = useProjects()
  const createMutation = useCreateProject()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const canSubmit =
    form.name.trim() && form.kind.trim() && form.priority.trim() && form.ownerPartyId.trim()

  const handleCreate = () => {
    if (!canSubmit) return
    createMutation.mutate(
      {
        name: form.name.trim(),
        kind: form.kind.trim(),
        priority: form.priority.trim(),
        ownerPartyId: form.ownerPartyId.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      },
      {
        onSuccess: () => {
          setShowForm(false)
          setForm(EMPTY_FORM)
        },
      },
    )
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.projects.length} project${data.projects.length === 1 ? '' : 's'}` : ' '}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            aria-label="New project"
          >
            New Project
          </button>
        )}
      </header>

      {showForm && (
        <div className="mb-6 rounded border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">New Project</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Project name"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                aria-label="Project name"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Owner Party ID *</label>
              <input
                type="text"
                value={form.ownerPartyId}
                onChange={set('ownerPartyId')}
                placeholder="party:tenant/party-id"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                aria-label="Owner party ID"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Kind *</label>
              <input
                type="text"
                value={form.kind}
                onChange={set('kind')}
                placeholder="e.g. Renovation"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                aria-label="Project kind"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Priority *</label>
              <input
                type="text"
                value={form.priority}
                onChange={set('priority')}
                placeholder="e.g. Medium"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                aria-label="Project priority"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="Optional description"
                rows={2}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                aria-label="Project description"
              />
            </div>
          </div>
          {createMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed to create project'}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !canSubmit}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
