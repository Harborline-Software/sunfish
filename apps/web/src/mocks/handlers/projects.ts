/**
 * MSW handlers for the /api/v1/projects endpoint family.
 * PM pilot — Stage-06 contract-test scaffold (S05-3).
 *
 * These handlers ARE the contract-test scaffold and the real-Bridge swap safety net.
 * All response fixtures are shaped to the §2.3 DTO contracts in the Stage-05 hand-off.
 * The swap to real Bridge = MSW disabled in integration env; NO cockpit code change.
 *
 * 14 endpoints (per ONR recommendation; Engineer may collapse #13/#14 at PR 2).
 */

import { http, HttpResponse } from 'msw'
import type {
  ProjectListResponse,
  ProjectDetail,
  ProjectTimelineDto,
  MilestoneListResponse,
  ProjectBudget,
  TimeEntryListResponse,
  TimeEntry,
} from '@/api/projects'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURE_PROJECT_LIST: ProjectListResponse = {
  items: [
    {
      id: 'proj-ulid-0001',
      code: 'PRJ-001',
      name: 'Riverside Unit Renovation',
      status: 'InProgress',
      kind: 'Renovation',
      // ownerPartyId NOT present — negative match enforced
    },
    {
      id: 'proj-ulid-0002',
      code: 'PRJ-002',
      name: 'HVAC Replacement — Building B',
      status: 'Planned',
      kind: 'Maintenance',
    },
    {
      id: 'proj-ulid-0003',
      code: 'PRJ-003',
      name: 'Roof Capital Improvement',
      status: 'Draft',
      kind: 'Capital',
    },
  ],
  total: 3,
}

const FIXTURE_PROJECT_DETAIL: ProjectDetail = {
  id: 'proj-ulid-0001',
  code: 'PRJ-001',
  name: 'Riverside Unit Renovation',
  status: 'InProgress',
  kind: 'Renovation',
  plannedStart: '2026-03-01',
  plannedEnd: '2026-08-31',
  actualStart: '2026-03-05',
  actualEnd: null,
  percentComplete: 45,
  description: 'Full unit renovation including kitchen and bath.',
}

const FIXTURE_TIMELINE: ProjectTimelineDto = {
  projectId: 'proj-ulid-0001',
  code: 'PRJ-001',
  name: 'Riverside Unit Renovation',
  status: 'InProgress',
  plannedStart: '2026-03-01',
  plannedEnd: '2026-08-31',
  actualStart: '2026-03-05',
  actualEnd: null,
  percentComplete: 45,
  milestones: [
    {
      id: 'ms-0001',
      code: 'MS-1',
      name: 'Demo complete',
      kind: 'Phase',
      status: 'Achieved',
      plannedDate: '2026-04-01',
      actualDate: '2026-04-03',
      predecessorMilestoneId: null,
    },
    {
      id: 'ms-0002',
      code: 'MS-2',
      name: 'Framing and rough-in',
      kind: 'Phase',
      status: 'Achieved',
      plannedDate: '2026-05-15',
      actualDate: '2026-05-18',
      predecessorMilestoneId: 'ms-0001',
    },
    {
      id: 'ms-0003',
      code: 'MS-3',
      name: 'Finish and punch-out',
      kind: 'Gate',
      status: 'Pending',
      plannedDate: '2026-08-01',
      actualDate: null,
      predecessorMilestoneId: 'ms-0002',
    },
  ],
  // lines NOT present — negative match
  // timeEntries NOT present — negative match
}

const FIXTURE_MILESTONES: MilestoneListResponse = {
  milestones: FIXTURE_TIMELINE.milestones,
}

const FIXTURE_BUDGET: ProjectBudget = {
  projectId: 'proj-ulid-0001',
  effectiveFrom: '2026-03-01',
  totalBudgeted: 85000,
  totalActual: 38250,
  lines: [
    { category: 'Labor', budgetedAmount: 45000, actualAmount: 22000 },
    { category: 'Materials', budgetedAmount: 30000, actualAmount: 14500 },
    { category: 'Permits', budgetedAmount: 5000, actualAmount: 1750 },
    { category: 'Contingency', budgetedAmount: 5000, actualAmount: 0 },
  ],
}

const FIXTURE_TIME_ENTRIES: TimeEntryListResponse = {
  items: [
    {
      id: 'te-0001',
      workerPartyId: 'party-worker-001',
      status: 'Submitted',
      openedAt: '2026-05-01T08:00:00Z',
      stoppedAt: '2026-05-01T16:00:00Z',
      durationMinutes: 480,
      hourlyRate: 75,
      submittedAt: '2026-05-02T09:00:00Z',
    },
    {
      id: 'te-0002',
      workerPartyId: 'party-worker-002',
      status: 'Open',
      openedAt: '2026-05-30T09:00:00Z',
      stoppedAt: null,
      durationMinutes: null,
      hourlyRate: null,
      submittedAt: null,
    },
  ],
  total: 2,
}

const FIXTURE_TIME_ENTRY_OPENED: TimeEntry = {
  id: 'te-new-001',
  workerPartyId: 'party-worker-002',
  status: 'Open',
  openedAt: new Date().toISOString(),
  stoppedAt: null,
  durationMinutes: null,
  hourlyRate: null,
  submittedAt: null,
}

// ── Handlers — one per endpoint ───────────────────────────────────────────────

export const projectHandlers = [
  // #1 — GET /api/v1/projects (list)
  http.get('/api/v1/projects', () => {
    return HttpResponse.json(FIXTURE_PROJECT_LIST)
  }),

  // #2 — GET /api/v1/projects/:id (detail)
  http.get('/api/v1/projects/:id', ({ params }) => {
    const { id } = params as { id: string }
    // Cross-tenant probe: return 404 for unknown ids (no tenant oracle — D2)
    if (id === 'cross-tenant-probe') {
      return HttpResponse.json(
        { title: 'project-not-found', status: 404 },
        { status: 404 },
      )
    }
    return HttpResponse.json({ ...FIXTURE_PROJECT_DETAIL, id })
  }),

  // #3 — GET /api/v1/projects/:id/timeline (Gantt)
  http.get('/api/v1/projects/:id/timeline', ({ params }) => {
    const { id } = params as { id: string }
    if (id === 'cross-tenant-probe') {
      return HttpResponse.json({ title: 'project-not-found', status: 404 }, { status: 404 })
    }
    return HttpResponse.json({ ...FIXTURE_TIMELINE, projectId: id })
  }),

  // #4 — GET /api/v1/projects/:id/milestones
  http.get('/api/v1/projects/:id/milestones', ({ params }) => {
    const { id } = params as { id: string }
    if (id === 'cross-tenant-probe') {
      return HttpResponse.json({ title: 'project-not-found', status: 404 }, { status: 404 })
    }
    return HttpResponse.json(FIXTURE_MILESTONES)
  }),

  // #5 — GET /api/v1/projects/:id/budget
  http.get('/api/v1/projects/:id/budget', ({ params }) => {
    const { id } = params as { id: string }
    if (id === 'cross-tenant-probe') {
      return HttpResponse.json({ title: 'project-not-found', status: 404 }, { status: 404 })
    }
    return HttpResponse.json({ ...FIXTURE_BUDGET, projectId: id })
  }),

  // #6 — GET /api/v1/projects/:id/time (time entry list)
  http.get('/api/v1/projects/:id/time', ({ params }) => {
    const { id } = params as { id: string }
    if (id === 'cross-tenant-probe') {
      return HttpResponse.json({ title: 'project-not-found', status: 404 }, { status: 404 })
    }
    void id
    return HttpResponse.json(FIXTURE_TIME_ENTRIES)
  }),

  // #7 — POST /api/v1/projects (create)
  http.post('/api/v1/projects', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    // Verify no ownerPartyId in body (auth-bypass negative match)
    if ('ownerPartyId' in body) {
      return HttpResponse.json(
        { title: 'invalid-request', status: 400, detail: 'ownerPartyId must not be supplied' },
        { status: 400 },
      )
    }
    return HttpResponse.json({ ...FIXTURE_PROJECT_DETAIL, name: String(body['name'] ?? '') }, { status: 201 })
  }),

  // #8 — POST /api/v1/projects/:id/transition (designated-authority seam — D1)
  http.post('/api/v1/projects/:id/transition', async ({ params, request }) => {
    const { id } = params as { id: string }
    const body = await request.json() as Record<string, unknown>
    // Verify no actingPartyId in body
    if ('actingPartyId' in body) {
      return HttpResponse.json(
        { title: 'invalid-request', status: 400, detail: 'actingPartyId must not be supplied' },
        { status: 400 },
      )
    }
    // Non-owner probe
    if (id === 'not-owner-probe') {
      return HttpResponse.json({ title: 'not-project-owner', status: 403 }, { status: 403 })
    }
    // Illegal transition probe
    if (String(body['targetStatus']) === 'InProgress' && id === 'cancelled-proj') {
      return HttpResponse.json({ title: 'illegal-status-transition', status: 409 }, { status: 409 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // #9 — POST /api/v1/projects/:id/milestones
  http.post('/api/v1/projects/:id/milestones', async () => {
    return new HttpResponse(null, { status: 201 })
  }),

  // #10 — POST /api/v1/projects/:id/milestones/:mid/achieve
  http.post('/api/v1/projects/:id/milestones/:mid/achieve', async () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // #11 — POST /api/v1/projects/:id/budget (budget revision)
  http.post('/api/v1/projects/:id/budget', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    // Overlap probe
    if (String(body['effectiveFrom']) === '2026-01-01') {
      return HttpResponse.json({ title: 'overlapping-budget-revision', status: 409 }, { status: 409 })
    }
    return new HttpResponse(null, { status: 201 })
  }),

  // #12 — POST /api/v1/projects/:id/time (open/stop/submit)
  http.post('/api/v1/projects/:id/time', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    // Rate-authority probe: rate-setting by unauthorized role
    if (body['action'] === 'stop' && body['__workerSelf'] === true) {
      return HttpResponse.json({ title: 'rate-authority-denied', status: 403 }, { status: 403 })
    }
    return HttpResponse.json(FIXTURE_TIME_ENTRY_OPENED, { status: 201 })
  }),

  // #13 — POST /api/v1/projects/:id/time/:teid/approve
  http.post('/api/v1/projects/:id/time/:teid/approve', async ({ params }) => {
    const { teid } = params as { teid: string }
    // Self-approval probe — D3
    if (teid === 'self-approve-probe') {
      return HttpResponse.json({ title: 'self-approval-denied', status: 403 }, { status: 403 })
    }
    // Verify no approverPartyId in body is enforced at the handler level (Bridge responsibility)
    return new HttpResponse(null, { status: 204 })
  }),

  // #14 — POST /api/v1/projects/:id/time/:teid/reject
  http.post('/api/v1/projects/:id/time/:teid/reject', async ({ params }) => {
    const { teid } = params as { teid: string }
    if (teid === 'self-approve-probe') {
      return HttpResponse.json({ title: 'self-approval-denied', status: 403 }, { status: 403 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
