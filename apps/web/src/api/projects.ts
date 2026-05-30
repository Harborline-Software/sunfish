/**
 * Bridge client for the /api/v1/projects endpoint family.
 * W#79 PM pilot — PR 3 cockpit shell.
 *
 * Fetch convention: relative URLs, credentials: 'include', throwFromResponse on non-2xx.
 * DateOnly fields serialize to ISO yyyy-MM-dd strings — type as string, NOT Date.
 *
 * Negative-match DTO discipline (sec-eng A2, ADR-0099 §2.3):
 *   - No ownerPartyId / actingPartyId / approverPartyId / rejecterPartyId / partyId on
 *     any list or timeline shape — those fields are auth-bypass vectors.
 *   - No budget* / lines / timeEntries on ProjectSummary or ProjectTimeline.
 *   - Write request bodies carry NO actingPartyId / approverPartyId — server-derives from
 *     authenticated session principal (ICurrentUser.UserId → domain PartyId).
 */

import { throwFromResponse } from './problem-details'
export { ProblemDetailsError } from './problem-details'

// ── status / kind enumerations ────────────────────────────────────────────────

export type ProjectStatus =
  | 'Draft'
  | 'Planned'
  | 'InProgress'
  | 'OnHold'
  | 'Blocked'
  | 'Completed'
  | 'Closed'
  | 'Cancelled'

// ── read DTOs ─────────────────────────────────────────────────────────────────

/** Endpoint #1 — GET /api/v1/projects */
export interface ProjectSummary {
  id: string
  code: string
  name: string
  status: ProjectStatus
  kind: string
  // NEGATIVE MATCH: NO ownerPartyId, NO budget*, NO lines, NO timeEntries
}

export interface ProjectList {
  projects: ProjectSummary[]
}

/** Endpoint #2 — GET /api/v1/projects/{id} */
export interface ProjectDetail extends ProjectSummary {
  description: string | null
  plannedStart: string | null   // ISO date yyyy-MM-dd
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  // NEGATIVE MATCH: NO ownerPartyId, NO actingPartyId
}

/** Endpoint #3 — GET /api/v1/projects/{id}/milestones */
export interface ProjectMilestone {
  id: string
  code: string
  name: string
  kind: string
  status: string
  plannedDate: string | null    // ISO date yyyy-MM-dd
  actualDate: string | null
  predecessorMilestoneId: string | null
}

export interface ProjectMilestoneList {
  milestones: ProjectMilestone[]
}

/** Endpoint #4 — GET /api/v1/projects/{id}/timeline */
export interface ProjectTimeline {
  projectId: string
  code: string
  name: string
  status: ProjectStatus
  plannedStart: string | null   // ISO date yyyy-MM-dd
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  percentComplete: number | null
  milestones: ProjectTimelineMilestone[]
  // NEGATIVE MATCH: NO ownerPartyId, NO lines, NO timeEntries
}

export interface ProjectTimelineMilestone {
  id: string
  code: string
  name: string
  kind: string
  status: string
  plannedDate: string | null    // ISO date yyyy-MM-dd
  actualDate: string | null
  predecessorMilestoneId: string | null
}

/** Endpoint #5 — GET /api/v1/projects/{id}/budget (§2.3 reconciled against signal-bridge#61) */

export type BudgetCategory = string  // BudgetCategory enum → string on the wire

export interface ProjectBudgetLine {
  id: string
  category: BudgetCategory
  budgetedAmount: number
  currency: string              // ISO-4217
  glAccountId?: string          // GUID; optional
  notes?: string
  // NEGATIVE MATCH: NO budgetId (internal FK), NO tenantId, NO createdAt/createdBy
}

export interface ProjectBudgetRevision {
  id: string
  revisionNumber: number
  effectiveFrom: string         // ISO date yyyy-MM-dd (DateOnly)
  effectiveUntil?: string       // ISO date yyyy-MM-dd (DateOnly); absent if open-ended
  notes?: string
  lines: ProjectBudgetLine[]
  // NEGATIVE MATCH: NO supersededAt, NO deletedAt, NO createdAt/createdBy
}

/** Budget-vs-actual rollup row per category (Bridge-assembled) */
export interface BudgetVsActualRollup {
  category: BudgetCategory
  budgetedAmount: number
  actualAmount: number
  // NEGATIVE MATCH: NO currency (rollup is currency-agnostic)
}

export interface ProjectBudget {
  projectId: string
  currentRevision: ProjectBudgetRevision | null
  rollup: BudgetVsActualRollup[]
  // NEGATIVE MATCH: NO tenantId
}

/** Endpoint #6 — GET /api/v1/projects/{id}/time-entries (§2.3 reconciled against signal-bridge#61) */

export type ActivityKind = string   // ActivityKind enum → string on the wire
export type TimeEntryStatus = 'Open' | 'Stopped' | 'Submitted' | 'Approved' | 'Rejected'

export interface TimeEntry {
  id: string
  workerPartyId: string         // GUID
  projectId?: string            // GUID; absent for non-project entries
  activityKind: ActivityKind
  startedAt: string             // ISO-8601 datetime (Instant) — distinct from DateOnly date
  endedAt?: string              // ISO-8601 datetime (Instant)
  durationMinutes: number
  billable: boolean
  hourlyRate?: number
  hourlyRateCurrency?: string   // ISO-4217
  amount?: number
  description?: string
  status: TimeEntryStatus
  submittedAt?: string          // ISO-8601 datetime (Instant)
  // NEGATIVE MATCH: NO tenantId, NO workOrderId, NO maintenanceTaskId, NO glAccountId
  // NO approvedByPartyId/approvedAt, NO rejectedByPartyId/rejectedAt/rejectionReason
  // NO invoicedFlag, NO audit fields, NO version
}

export interface TimeEntryList {
  entries: TimeEntry[]
}

// ── write request DTOs ────────────────────────────────────────────────────────
// sec-eng A2: ALL actingPartyId / approverPartyId / rejecterPartyId / partyId
// are server-derived from the authenticated session. NEVER sent in request body.

/** Endpoint #7 — POST /api/v1/projects */
export interface CreateProjectInput {
  code: string
  name: string
  kind: string
  plannedStart?: string         // ISO date yyyy-MM-dd
  plannedEnd?: string
  // NEGATIVE MATCH: NO ownerPartyId — server-derives from session principal
}

export interface ProjectCreated {
  id: string
}

/** Endpoint #8 — POST /api/v1/projects/{id}/transition */
export interface TransitionProjectInput {
  targetStatus: ProjectStatus
  // NEGATIVE MATCH: NO actingPartyId — server-derives from session principal
}

/** Endpoint #9 — POST /api/v1/projects/{id}/milestones */
export interface AddMilestoneInput {
  code: string
  name: string
  kind: string
  plannedDate?: string          // ISO date yyyy-MM-dd
  predecessorMilestoneId?: string
}

export interface MilestoneAdded {
  id: string
}

/** Endpoint #10 — POST /api/v1/projects/{id}/milestones/{mid}/achieve */
export interface AchieveMilestoneInput {
  actualDate?: string           // ISO date yyyy-MM-dd; defaults to today server-side
}

/** Endpoint #11 — POST /api/v1/projects/{id}/budget-revisions */
export interface InsertBudgetRevisionInput {
  effectiveDate: string         // ISO date yyyy-MM-dd
  description?: string
  lines: { category: string; amount: number }[]
  // NEGATIVE MATCH: NO actingPartyId
}

export interface BudgetRevisionInserted {
  revisionId: string
}

/** Endpoints #12a–#12c — POST /api/v1/time-entries/{id}/open|stop|submit */
export interface StopTimeInput {
  billableRate: number          // rate-authority verified server-side per §5a
}

/** Endpoint #13 — POST /api/v1/time-entries/{id}/approve */
// Body is empty — approverPartyId is server-derived from session
/** Endpoint #14 — POST /api/v1/time-entries/{id}/reject */
// Body is empty — rejecterPartyId is server-derived from session

// ── error discriminators (§2.4 + council amendments) ─────────────────────────

export class NotProjectOwnerError extends Error {
  constructor() { super('not-project-owner'); this.name = 'NotProjectOwnerError' }
}
export class OverlappingBudgetRevisionError extends Error {
  constructor() { super('overlapping-budget-revision'); this.name = 'OverlappingBudgetRevisionError' }
}
export class InvalidBudgetLinesError extends Error {
  constructor() { super('invalid-budget-lines'); this.name = 'InvalidBudgetLinesError' }
}
export class IllegalStatusTransitionError extends Error {
  constructor() { super('illegal-status-transition'); this.name = 'IllegalStatusTransitionError' }
}
export class ProjectNotFoundError extends Error {
  constructor() { super('project-not-found'); this.name = 'ProjectNotFoundError' }
}
export class RateAuthorityDeniedError extends Error {
  constructor() { super('rate-authority-denied'); this.name = 'RateAuthorityDeniedError' }
}
export class SelfApprovalDeniedError extends Error {
  constructor() { super('self-approval-denied'); this.name = 'SelfApprovalDeniedError' }
}
export class InvalidProjectPayloadError extends Error {
  constructor() { super('invalid-project-payload'); this.name = 'InvalidProjectPayloadError' }
}
export class DuplicateProjectCodeError extends Error {
  constructor() { super('duplicate-project-code'); this.name = 'DuplicateProjectCodeError' }
}
export class MilestoneNotFoundError extends Error {
  constructor() { super('milestone-not-found'); this.name = 'MilestoneNotFoundError' }
}

const PROJECT_DISCRIMINATORS: Partial<
  Record<string, (status: number, detail?: string) => never>
> = {
  'not-project-owner':          () => { throw new NotProjectOwnerError() },
  'overlapping-budget-revision': () => { throw new OverlappingBudgetRevisionError() },
  'invalid-budget-lines':       () => { throw new InvalidBudgetLinesError() },
  'illegal-status-transition':  () => { throw new IllegalStatusTransitionError() },
  'project-not-found':          () => { throw new ProjectNotFoundError() },
  'rate-authority-denied':      () => { throw new RateAuthorityDeniedError() },
  'self-approval-denied':       () => { throw new SelfApprovalDeniedError() },
  'invalid-project-payload':    () => { throw new InvalidProjectPayloadError() },
  'duplicate-project-code':     () => { throw new DuplicateProjectCodeError() },
  'milestone-not-found':        () => { throw new MilestoneNotFoundError() },
}

// ── API client helpers ────────────────────────────────────────────────────────

async function getCsrfToken(): Promise<string> {
  const resp = await fetch('/api/v1/cockpit/antiforgery-token', { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to fetch CSRF token')
  const body = (await resp.json()) as { token: string }
  return body.token
}

async function csrfHeaders(): Promise<Record<string, string>> {
  const token = await getCsrfToken()
  return { 'X-XSRF-TOKEN': token, 'Content-Type': 'application/json' }
}

// ── read endpoints ────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectList> {
  const resp = await fetch('/api/v1/projects', { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load projects', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as ProjectList
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}`, { credentials: 'include' })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load project', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as ProjectDetail
}

export async function getProjectMilestones(id: string): Promise<ProjectMilestoneList> {
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/milestones`, {
    credentials: 'include',
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load milestones', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as ProjectMilestoneList
}

export async function getProjectTimeline(id: string): Promise<ProjectTimeline> {
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/timeline`, {
    credentials: 'include',
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load timeline', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as ProjectTimeline
}

export async function getProjectBudget(id: string): Promise<ProjectBudget> {
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/budget`, {
    credentials: 'include',
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load budget', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as ProjectBudget
}

export async function getProjectTimeEntries(id: string): Promise<TimeEntryList> {
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/time-entries`, {
    credentials: 'include',
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to load time entries', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntryList
}

// ── write endpoints ───────────────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput): Promise<ProjectCreated> {
  const headers = await csrfHeaders()
  const resp = await fetch('/api/v1/projects', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to create project', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as ProjectCreated
}

export async function transitionProject(
  id: string,
  input: TransitionProjectInput,
): Promise<void> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/transition`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to transition project', PROJECT_DISCRIMINATORS)
}

export async function addMilestone(
  id: string,
  input: AddMilestoneInput,
): Promise<MilestoneAdded> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/milestones`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to add milestone', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as MilestoneAdded
}

export async function achieveMilestone(
  id: string,
  milestoneId: string,
  input?: AchieveMilestoneInput,
): Promise<void> {
  const headers = await csrfHeaders()
  const resp = await fetch(
    `/api/v1/projects/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}/achieve`,
    {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(input ?? {}),
    },
  )
  if (!resp.ok) return throwFromResponse(resp, 'Failed to achieve milestone', PROJECT_DISCRIMINATORS)
}

export async function insertBudgetRevision(
  id: string,
  input: InsertBudgetRevisionInput,
): Promise<BudgetRevisionInserted> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/budget-revisions`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to insert budget revision', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as BudgetRevisionInserted
}

export async function openTimeEntry(projectId: string): Promise<TimeEntry> {
  const headers = await csrfHeaders()
  const resp = await fetch('/api/v1/time-entries/open', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ projectId }),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to open time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntry
}

export async function stopTimeEntry(entryId: string, input: StopTimeInput): Promise<TimeEntry> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/time-entries/${encodeURIComponent(entryId)}/stop`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to stop time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntry
}

export async function submitTimeEntry(entryId: string): Promise<TimeEntry> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/time-entries/${encodeURIComponent(entryId)}/submit`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({}),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to submit time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntry
}

export async function approveTimeEntry(entryId: string): Promise<void> {
  // Body is intentionally empty — approverPartyId is server-derived from session
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/time-entries/${encodeURIComponent(entryId)}/approve`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({}),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to approve time entry', PROJECT_DISCRIMINATORS)
}

export async function rejectTimeEntry(entryId: string): Promise<void> {
  // Body is intentionally empty — rejecterPartyId is server-derived from session
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/time-entries/${encodeURIComponent(entryId)}/reject`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({}),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to reject time entry', PROJECT_DISCRIMINATORS)
}
