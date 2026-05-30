/**
 * Bridge client for the /api/v1/projects endpoint family.
 * PM pilot — Stage-06 build.
 *
 * DTOs are pinned to §2.3 of the Stage-05 hand-off (pm-pilot-stage-05-hand-off.md).
 * DateOnly fields serialize to ISO yyyy-MM-dd strings — type as string, NOT Date.
 * NEGATIVE MATCHES (must NOT appear): ownerPartyId / actingPartyId / approverPartyId
 * on list/timeline shapes; budget* / lines / timeEntries on list/timeline shapes.
 * These are session-derived on the server; never body-supplied.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'Draft'
  | 'Planned'
  | 'InProgress'
  | 'OnHold'
  | 'Blocked'
  | 'Completed'
  | 'Closed'
  | 'Cancelled'

export type ProjectKind = 'General' | 'Renovation' | 'Maintenance' | 'Capital' | 'Lease'

export type MilestoneKind = 'Phase' | 'Deliverable' | 'Review' | 'Gate'

export type MilestoneStatus = 'Pending' | 'Achieved' | 'Missed'

export type TimeEntryStatus = 'Open' | 'Stopped' | 'Submitted'

// ── List / summary ────────────────────────────────────────────────────────────

/** Endpoint #1 — GET /api/v1/projects */
export interface ProjectSummary {
  id: string
  code: string
  name: string
  status: ProjectStatus
  kind: ProjectKind
  // NEGATIVE: ownerPartyId NOT on summary — session-derived server side
  // NEGATIVE: budget* NOT on summary
}

export interface ProjectListResponse {
  items: ProjectSummary[]
  total: number
}

// ── Detail ────────────────────────────────────────────────────────────────────

/** Endpoint #2 — GET /api/v1/projects/{id} */
export interface ProjectDetail {
  id: string
  code: string
  name: string
  status: ProjectStatus
  kind: ProjectKind
  plannedStart: string | null  // ISO date yyyy-MM-dd
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  percentComplete: number | null
  description: string | null
}

// ── Timeline (Gantt) ──────────────────────────────────────────────────────────

/** Endpoint #3 — GET /api/v1/projects/{id}/timeline */
export interface ProjectTimelineMilestone {
  id: string
  code: string
  name: string
  kind: MilestoneKind
  status: MilestoneStatus
  plannedDate: string | null   // ISO date
  actualDate: string | null
  predecessorMilestoneId: string | null
  // NEGATIVE: lines NOT here
  // NEGATIVE: timeEntries NOT here
}

export interface ProjectTimelineDto {
  projectId: string
  code: string
  name: string
  status: ProjectStatus
  plannedStart: string | null
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  percentComplete: number | null
  milestones: ProjectTimelineMilestone[]
}

// ── Milestones ────────────────────────────────────────────────────────────────

/** Endpoint #4 — GET /api/v1/projects/{id}/milestones */
export interface MilestoneListResponse {
  milestones: ProjectTimelineMilestone[]
}

// ── Budget ────────────────────────────────────────────────────────────────────

/** Endpoint #5 — GET /api/v1/projects/{id}/budget */
export interface BudgetLine {
  category: string
  budgetedAmount: number
  actualAmount: number
}

export interface ProjectBudget {
  projectId: string
  effectiveFrom: string  // ISO date
  totalBudgeted: number
  totalActual: number
  lines: BudgetLine[]
}

// ── Time entries ──────────────────────────────────────────────────────────────

/** Endpoint #6 — GET /api/v1/projects/{id}/time */
export interface TimeEntry {
  id: string
  workerPartyId: string
  status: TimeEntryStatus
  openedAt: string          // ISO datetime
  stoppedAt: string | null
  durationMinutes: number | null
  hourlyRate: number | null
  submittedAt: string | null
}

export interface TimeEntryListResponse {
  items: TimeEntry[]
  total: number
}

// ── Write inputs ──────────────────────────────────────────────────────────────

/** Endpoint #7 — POST /api/v1/projects */
export interface CreateProjectInput {
  name: string
  code: string
  kind: ProjectKind
  plannedStart?: string | null
  plannedEnd?: string | null
  description?: string | null
  // NEGATIVE: ownerPartyId NOT in body — session-derived server side
}

/** Endpoint #8 — POST /api/v1/projects/{id}/transition */
export interface TransitionProjectInput {
  targetStatus: ProjectStatus
  // NEGATIVE: actingPartyId NOT in body — must be session-derived in Bridge handler
}

/** Endpoint #9 — POST /api/v1/projects/{id}/milestones */
export interface AddMilestoneInput {
  name: string
  code: string
  kind: MilestoneKind
  plannedDate?: string | null
  predecessorMilestoneId?: string | null
}

/** Endpoint #10 — POST /api/v1/projects/{id}/milestones/{mid}/achieve */
export interface AchieveMilestoneInput {
  actualDate: string  // ISO date
}

/** Endpoint #11 — POST /api/v1/projects/{id}/budget */
export interface BudgetRevisionInput {
  effectiveFrom: string  // ISO date
  lines: Array<{ category: string; budgetedAmount: number }>
}

/** Endpoint #12 — POST /api/v1/projects/{id}/time (action discriminator) */
export type TimeLifecycleAction = 'open' | 'stop' | 'submit'

export interface TimeLifecycleInput {
  action: TimeLifecycleAction
  hourlyRate?: number | null  // only on stop — rate-authority gated server side
}

/** Endpoints #13/#14 — POST /api/v1/projects/{id}/time/{teid}/approve|reject */
export interface TimeApprovalInput {
  reason?: string | null
  // NEGATIVE: approverPartyId NOT in body — session-derived server side
}

// ── RFC 7807 error shape ──────────────────────────────────────────────────────

export interface ProblemDetail {
  title: string
  status: number
  detail?: string
}

// ── API client functions ──────────────────────────────────────────────────────

const BASE = '/api/v1/projects'

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const resp = await fetch(input, { credentials: 'include', ...init })
  if (!resp.ok) {
    const problem = await resp.json().catch(() => ({ title: resp.statusText, status: resp.status }))
    const err = new Error((problem as ProblemDetail).title ?? `HTTP ${resp.status}`)
    ;(err as Error & { status: number }).status = resp.status
    throw err
  }
  return (await resp.json()) as T
}

export async function getProjects(): Promise<ProjectListResponse> {
  return fetchJson<ProjectListResponse>(BASE)
}

export async function getProject(id: string): Promise<ProjectDetail> {
  return fetchJson<ProjectDetail>(`${BASE}/${encodeURIComponent(id)}`)
}

export async function getProjectTimeline(id: string): Promise<ProjectTimelineDto> {
  return fetchJson<ProjectTimelineDto>(`${BASE}/${encodeURIComponent(id)}/timeline`)
}

export async function getProjectMilestones(id: string): Promise<MilestoneListResponse> {
  return fetchJson<MilestoneListResponse>(`${BASE}/${encodeURIComponent(id)}/milestones`)
}

export async function getProjectBudget(id: string): Promise<ProjectBudget> {
  return fetchJson<ProjectBudget>(`${BASE}/${encodeURIComponent(id)}/budget`)
}

export async function getProjectTimeEntries(id: string): Promise<TimeEntryListResponse> {
  return fetchJson<TimeEntryListResponse>(`${BASE}/${encodeURIComponent(id)}/time`)
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  return fetchJson<ProjectDetail>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function transitionProject(id: string, input: TransitionProjectInput): Promise<void> {
  await fetchJson<void>(`${BASE}/${encodeURIComponent(id)}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function addMilestone(id: string, input: AddMilestoneInput): Promise<void> {
  await fetchJson<void>(`${BASE}/${encodeURIComponent(id)}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function achieveMilestone(id: string, milestoneId: string, input: AchieveMilestoneInput): Promise<void> {
  await fetchJson<void>(`${BASE}/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}/achieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function insertBudgetRevision(id: string, input: BudgetRevisionInput): Promise<void> {
  await fetchJson<void>(`${BASE}/${encodeURIComponent(id)}/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function timeLifecycle(id: string, input: TimeLifecycleInput): Promise<TimeEntry> {
  return fetchJson<TimeEntry>(`${BASE}/${encodeURIComponent(id)}/time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function approveTimeEntry(id: string, timeEntryId: string, input: TimeApprovalInput): Promise<void> {
  await fetchJson<void>(`${BASE}/${encodeURIComponent(id)}/time/${encodeURIComponent(timeEntryId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function rejectTimeEntry(id: string, timeEntryId: string, input: TimeApprovalInput): Promise<void> {
  await fetchJson<void>(`${BASE}/${encodeURIComponent(id)}/time/${encodeURIComponent(timeEntryId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
