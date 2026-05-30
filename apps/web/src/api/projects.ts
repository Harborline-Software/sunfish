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
// sec-eng A2: actingPartyId / approverPartyId / rejecterPartyId / createdBy /
// updatedBy are ALL server-derived from the authenticated session principal via
// IPartyContext. NEVER sent in request body.
//
// NOTE: ownerPartyId on CreateProjectInput IS body-supplied — it is the PROJECT
// OWNER (a business relationship), not the session actor. The Bridge contracts
// file explicitly marks it as "deliberately NOT in the forbidden set." The actor
// (createdBy) is still server-derived and carries no wire field.

/** Endpoint #7 — POST /api/v1/projects */
export interface CreateProjectInput {
  name: string
  kind: string
  priority: string
  ownerPartyId: string          // project owner (BUSINESS field, NOT the session actor)
  description?: string
  propertyId?: string
  customerPartyId?: string
  parentProjectId?: string
  plannedStartDate?: string     // ISO date yyyy-MM-dd
  plannedEndDate?: string
  // NEGATIVE MATCH: NO code (server-generated), NO actingPartyId/createdBy
}

export interface ProjectCreated {
  id: string
}

/** Endpoint #8 — POST /api/v1/projects/{id}/transition */
export interface TransitionProjectInput {
  newStatus: string             // ProjectStatus value
  notes?: string
  // NEGATIVE MATCH: NO actingPartyId — server-derives from session principal
}

export interface ProjectStatusResponse {
  id: string
  status: string
}

/** Endpoint #9 — POST /api/v1/projects/{id}/milestones */
export interface AddMilestoneInput {
  code: string
  name: string
  kind: string
  plannedDate: string           // ISO date yyyy-MM-dd (required)
  weight?: number
  paymentAmount?: number
  paymentCurrency?: string      // ISO-4217
  triggersInvoice?: boolean
  customerPartyId?: string
  // NEGATIVE MATCH: NO predecessorMilestoneId (read-only), NO actingPartyId
}

export interface MilestoneAdded {
  id: string
}

export interface MilestoneStatusResponse {
  id: string
  status: string
}

/** Endpoint #10 — POST /api/v1/projects/{id}/milestones/{mid}/achieve */
export interface AchieveMilestoneInput {
  actualDate?: string           // ISO date yyyy-MM-dd; defaults to today server-side
  notes?: string
}

/** Endpoint #11 — POST /api/v1/projects/{id}/budget */
export interface InsertBudgetRevisionInput {
  effectiveFrom: string         // ISO date yyyy-MM-dd
  notes?: string
  lines: BudgetLineInput[]
  // NEGATIVE MATCH: NO actingPartyId
}

export interface BudgetLineInput {
  category: string
  budgetedAmount: number
  currency: string              // ISO-4217 (required per Bridge contracts)
  glAccountId?: string
  notes?: string
}

export interface BudgetRevisionInserted {
  id: string                    // was revisionId in scaffold; Bridge returns CreateBudgetRevisionResponse.Id
}

/** Endpoint #12 — POST /api/v1/projects/{id}/time-entries (action discriminator) */
export interface OpenTimeEntryInput {
  activityKind: string
  startedAt: string             // ISO-8601 datetime (Instant)
  billable?: boolean
  description?: string
  glAccountId?: string
}

export interface StopTimeEntryInput {
  entryId: string
  endedAt: string               // ISO-8601 datetime (Instant)
  hourlyRate?: number
  hourlyRateCurrency?: string   // ISO-4217
}

export interface SubmitTimeEntryInput {
  entryId: string
}

export interface TimeEntryStatusResponse {
  id: string
  status: string
}

/** Endpoint #13 — POST /api/v1/projects/{id}/time-entries/{tid}/approve */
export interface ApproveTimeEntryInput {
  notes?: string
  // approverPartyId is server-derived from session — NOT on this DTO
}

export interface TimeEntryApprovalResponse {
  id: string
  approvedByPartyId: string
}

/** Endpoint #14 — POST /api/v1/projects/{id}/time-entries/{tid}/reject */
export interface RejectTimeEntryInput {
  reason: string                // required by Bridge
  notes?: string
  // rejecterPartyId is server-derived from session — NOT on this DTO
}

export interface TimeEntryRejectionResponse {
  id: string
  rejectedByPartyId: string
}

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
export class TimeEntryNotFoundError extends Error {
  constructor() { super('time-entry-not-found'); this.name = 'TimeEntryNotFoundError' }
}
export class ApprovalAuthorityDeniedError extends Error {
  constructor() { super('approval-authority-denied'); this.name = 'ApprovalAuthorityDeniedError' }
}
export class SelfRejectionDeniedError extends Error {
  constructor() { super('self-rejection-denied'); this.name = 'SelfRejectionDeniedError' }
}
export class PartyUnresolvedError extends Error {
  constructor() { super('party-unresolved'); this.name = 'PartyUnresolvedError' }
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
  'time-entry-not-found':       () => { throw new TimeEntryNotFoundError() },
  'approval-authority-denied':  () => { throw new ApprovalAuthorityDeniedError() },
  'self-rejection-denied':      () => { throw new SelfRejectionDeniedError() },
  'party-unresolved':           () => { throw new PartyUnresolvedError() },
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
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/budget`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to insert budget revision', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as BudgetRevisionInserted
}

// ── Time-entry lifecycle (#12) — single project-scoped endpoint with action discriminator

export async function openTimeEntry(
  projectId: string,
  input: OpenTimeEntryInput,
): Promise<TimeEntryStatusResponse> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/time-entries`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ action: 'open', ...input }),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to open time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntryStatusResponse
}

export async function stopTimeEntry(
  projectId: string,
  input: StopTimeEntryInput,
): Promise<TimeEntryStatusResponse> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/time-entries`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ action: 'stop', timeEntryId: input.entryId, endedAt: input.endedAt, hourlyRate: input.hourlyRate, hourlyRateCurrency: input.hourlyRateCurrency }),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to stop time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntryStatusResponse
}

export async function submitTimeEntry(
  projectId: string,
  entryId: string,
): Promise<TimeEntryStatusResponse> {
  const headers = await csrfHeaders()
  const resp = await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/time-entries`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ action: 'submit', timeEntryId: entryId }),
  })
  if (!resp.ok) return throwFromResponse(resp, 'Failed to submit time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntryStatusResponse
}

export async function approveTimeEntry(
  projectId: string,
  entryId: string,
  input?: ApproveTimeEntryInput,
): Promise<TimeEntryApprovalResponse> {
  // approverPartyId is server-derived from session — NOT in the body
  const headers = await csrfHeaders()
  const resp = await fetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/time-entries/${encodeURIComponent(entryId)}/approve`,
    {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(input ?? {}),
    },
  )
  if (!resp.ok) return throwFromResponse(resp, 'Failed to approve time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntryApprovalResponse
}

export async function rejectTimeEntry(
  projectId: string,
  entryId: string,
  input: RejectTimeEntryInput,
): Promise<TimeEntryRejectionResponse> {
  // rejecterPartyId is server-derived from session — NOT in the body
  const headers = await csrfHeaders()
  const resp = await fetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/time-entries/${encodeURIComponent(entryId)}/reject`,
    {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(input),
    },
  )
  if (!resp.ok) return throwFromResponse(resp, 'Failed to reject time entry', PROJECT_DISCRIMINATORS)
  return (await resp.json()) as TimeEntryRejectionResponse
}
