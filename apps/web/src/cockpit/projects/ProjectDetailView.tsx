import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProject, useTransitionProject } from '@/hooks/useProjects'
import { ProjectGanttPanel } from './ProjectGanttPanel'
import { ProjectBudgetPanel } from './ProjectBudgetPanel'
import { ProjectMilestonesPanel } from './ProjectMilestonesPanel'
import { ProjectTimePanel } from './ProjectTimePanel'
import type { ProjectStatus } from '@/api/projects'

type Tab = 'gantt' | 'budget' | 'milestones' | 'time'

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

const PROJECT_STATUSES: ProjectStatus[] = [
  'Draft', 'Planned', 'InProgress', 'OnHold', 'Blocked', 'Completed', 'Closed', 'Cancelled',
]

const TABS: { id: Tab; label: string }[] = [
  { id: 'gantt',      label: 'Timeline' },
  { id: 'budget',     label: 'Budget' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'time',       label: 'Time' },
]

export function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = projectId ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('gantt')
  const { data, isPending, isError, error } = useProject(id)
  const transitionMutation = useTransitionProject(id)

  const [showTransition, setShowTransition] = useState(false)
  const [newStatus, setNewStatus] = useState<ProjectStatus>('Planned')
  const [transitionNotes, setTransitionNotes] = useState('')

  if (isPending) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading project…</p>
  }

  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p className="font-medium">Failed to load project</p>
        <p className="mt-1">{error instanceof Error ? error.message : String(error)}</p>
        <Link to="/cockpit/projects" className="mt-2 inline-block text-red-600 underline">
          Back to projects
        </Link>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/cockpit/projects"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ← Projects
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            <p className="mt-0.5 font-mono text-xs text-gray-500">{data.code}</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[data.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {data.status}
            </span>
            {!showTransition && (
              <button
                onClick={() => {
                  setShowTransition(true)
                  setNewStatus('Planned')
                  setTransitionNotes('')
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                aria-label="Transition project status"
              >
                Transition…
              </button>
            )}
          </div>
        </div>
        {showTransition && (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">New status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label="New project status"
              >
                {PROJECT_STATUSES.filter((s) => s !== data.status).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Notes</label>
              <input
                type="text"
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Optional"
                className="w-44 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label="Transition notes"
              />
            </div>
            <button
              onClick={() =>
                transitionMutation.mutate(
                  {
                    newStatus,
                    ...(transitionNotes.trim() ? { notes: transitionNotes.trim() } : {}),
                  },
                  { onSuccess: () => { setShowTransition(false); setTransitionNotes('') } },
                )
              }
              disabled={transitionMutation.isPending}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {transitionMutation.isPending ? 'Saving…' : 'Apply'}
            </button>
            <button
              onClick={() => setShowTransition(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
        {data.description && (
          <p className="mt-2 text-sm text-gray-600">{data.description}</p>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 pb-3 text-sm font-medium text-blue-600'
                  : 'pb-3 text-sm text-gray-500 hover:text-gray-700'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'gantt'      && <ProjectGanttPanel projectId={id} />}
        {activeTab === 'budget'     && <ProjectBudgetPanel projectId={id} />}
        {activeTab === 'milestones' && <ProjectMilestonesPanel projectId={id} />}
        {activeTab === 'time'       && <ProjectTimePanel projectId={id} />}
      </div>
    </div>
  )
}
