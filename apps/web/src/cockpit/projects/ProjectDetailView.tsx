import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProject, useTransitionProject } from '@/hooks/useProjects'
import type { ProjectStatus } from '@/api/projects'
import { ProjectGanttPanel } from './panels/ProjectGanttPanel'
import { ProjectBudgetPanel } from './panels/ProjectBudgetPanel'
import { ProjectMilestonesPanel } from './panels/ProjectMilestonesPanel'
import { ProjectTimePanel } from './panels/ProjectTimePanel'

/**
 * PM pilot — /cockpit/projects/:projectId detail page.
 * Routes: new route → pattern-009 sec-eng SPOT-CHECK required on PR-open.
 *
 * Status transitions enforce designated-authority (Pattern A, §4 of Stage-05 hand-off).
 * actingPartyId is NEVER sent in request body — Bridge derives from session principal.
 */

type Tab = 'gantt' | 'budget' | 'milestones' | 'time'

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

// Valid transitions per ProjectStatusMachine — D5 guard
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  Draft:      ['Planned', 'Cancelled'],
  Planned:    ['InProgress', 'Cancelled'],
  InProgress: ['OnHold', 'Blocked', 'Completed'],
  OnHold:     ['InProgress', 'Cancelled'],
  Blocked:    ['InProgress', 'Cancelled'],
  Completed:  ['Closed'],
  Closed:     [],
  Cancelled:  [],
}

export function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = projectId ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('gantt')

  const { data, isPending, isError, error, refetch } = useProject(id)
  const transitionMutation = useTransitionProject(id)

  if (!id) return <NotFound />

  if (isPending) {
    return <p className="text-gray-500">Loading project…</p>
  }

  if (isError) {
    const isNotFound = error instanceof Error && (error as Error & { status?: number }).status === 404
    if (isNotFound) return <NotFound />
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-red-700">Failed to load project</p>
        <p className="mt-1 text-sm text-gray-600">{error instanceof Error ? error.message : String(error)}</p>
        <button onClick={() => void refetch()} className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Retry
        </button>
      </div>
    )
  }

  const transitions = VALID_TRANSITIONS[data.status] ?? []

  function handleTransition(targetStatus: ProjectStatus) {
    // actingPartyId NOT in body — Bridge derives from session (§4, D1)
    transitionMutation.mutate({ targetStatus })
  }

  return (
    <div>
      {/* header */}
      <header className="mb-6">
        <Link to="/cockpit/projects" className="text-sm text-blue-600 hover:underline">
          ← Back to projects
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            <p className="text-sm text-gray-500">
              {data.code} · {data.kind}
              {data.plannedStart ? ` · ${data.plannedStart}` : ''}
              {data.plannedEnd ? ` → ${data.plannedEnd}` : ''}
              {data.percentComplete != null ? ` · ${data.percentComplete}%` : ''}
            </p>
            {data.description && (
              <p className="mt-1 text-sm text-gray-600">{data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-1 text-sm font-medium ${STATUS_COLORS[data.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {data.status}
            </span>
            {transitions.length > 0 && (
              <div className="flex flex-col gap-1">
                {transitions.map((target) => (
                  <button
                    key={target}
                    onClick={() => handleTransition(target)}
                    disabled={transitionMutation.isPending}
                    className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    → {target}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {transitionMutation.isError && (
          <p className="mt-1 text-sm text-red-600">
            {transitionMutation.error instanceof Error ? transitionMutation.error.message : 'Transition failed'}
          </p>
        )}
      </header>

      {/* tabs */}
      <nav className="mb-4 flex gap-1 border-b border-gray-200">
        {(['gantt', 'budget', 'milestones', 'time'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab === 'gantt' ? 'Gantt' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* panel */}
      {activeTab === 'gantt' && <ProjectGanttPanel projectId={id} />}
      {activeTab === 'budget' && <ProjectBudgetPanel projectId={id} />}
      {activeTab === 'milestones' && <ProjectMilestonesPanel projectId={id} />}
      {activeTab === 'time' && <ProjectTimePanel projectId={id} />}
    </div>
  )
}

function NotFound() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Project not found</h2>
      <Link to="/cockpit/projects" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to projects
      </Link>
    </div>
  )
}
