/**
 * ProjectTimePanel tests — role-gated write affordances.
 *
 * test-eng F10 (D3 mitigation): a non-approver sees ZERO approval affordances;
 *   an approver sees approve/reject buttons for Submitted entries.
 * Worker affordances: non-approver sees Start Timer + per-row Stop/Submit.
 *
 * Bridge enforces all gates independently — these tests cover UI-layer only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProjectTimePanel } from '../ProjectTimePanel'
import * as useProjectsHook from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import type { TimeEntryList } from '@/api/projects'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const SUBMITTED_ENTRY: TimeEntryList = {
  entries: [
    {
      id: 'te:dev-tenant/te-001',
      workerPartyId: 'party:dev-tenant/worker-001',
      projectId: 'proj:dev-tenant/proj-001',
      activityKind: 'Labor',
      description: 'Foundation inspection',
      status: 'Submitted',
      startedAt: '2026-05-01T08:00:00Z',
      endedAt: '2026-05-01T10:00:00Z',
      durationMinutes: 120,
      billable: true,
      hourlyRate: 95,
      submittedAt: '2026-05-01T10:05:00Z',
    },
  ],
}

const OPEN_ENTRY: TimeEntryList = {
  entries: [
    {
      id: 'te:dev-tenant/te-002',
      workerPartyId: 'party:dev-tenant/worker-001',
      projectId: 'proj:dev-tenant/proj-001',
      activityKind: 'Labor',
      description: 'On-site work',
      status: 'Open',
      startedAt: '2026-05-02T09:00:00Z',
      durationMinutes: 0,
      billable: true,
    },
  ],
}

const STOPPED_ENTRY: TimeEntryList = {
  entries: [
    {
      id: 'te:dev-tenant/te-003',
      workerPartyId: 'party:dev-tenant/worker-001',
      projectId: 'proj:dev-tenant/proj-001',
      activityKind: 'Labor',
      description: 'Completed work',
      status: 'Stopped',
      startedAt: '2026-05-02T09:00:00Z',
      endedAt: '2026-05-02T11:00:00Z',
      durationMinutes: 120,
      billable: true,
    },
  ],
}

const NO_OP_MUTATION = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
}

describe('ProjectTimePanel — role-gated approval UI (test-eng F10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useProjectsHook, 'useOpenTimeEntry').mockReturnValue(
      NO_OP_MUTATION as unknown as ReturnType<typeof useProjectsHook.useOpenTimeEntry>,
    )
    vi.spyOn(useProjectsHook, 'useStopTimeEntry').mockReturnValue(
      NO_OP_MUTATION as unknown as ReturnType<typeof useProjectsHook.useStopTimeEntry>,
    )
    vi.spyOn(useProjectsHook, 'useSubmitTimeEntry').mockReturnValue(
      NO_OP_MUTATION as unknown as ReturnType<typeof useProjectsHook.useSubmitTimeEntry>,
    )
    vi.spyOn(useProjectsHook, 'useApproveTimeEntry').mockReturnValue(
      NO_OP_MUTATION as unknown as ReturnType<typeof useProjectsHook.useApproveTimeEntry>,
    )
    vi.spyOn(useProjectsHook, 'useRejectTimeEntry').mockReturnValue(
      NO_OP_MUTATION as unknown as ReturnType<typeof useProjectsHook.useRejectTimeEntry>,
    )
    vi.spyOn(useProjectsHook, 'useProjectTimeEntries').mockReturnValue({
      data: SUBMITTED_ENTRY,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectTimeEntries>)
  })

  it('worker role: approve and reject buttons are absent for all entries', () => {
    useAuthStore.setState({ role: 'owner', user: 'worker-user', loaded: true, isAuthenticated: true })

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.queryByRole('button', { name: /approve time entry/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject time entry/i })).not.toBeInTheDocument()
  })

  it('worker role: Start Timer button is present', () => {
    useAuthStore.setState({ role: 'owner', user: 'worker-user', loaded: true, isAuthenticated: true })

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument()
  })

  it('worker role: clicking Start Timer shows activity input and start button', () => {
    useAuthStore.setState({ role: 'owner', user: 'worker-user', loaded: true, isAuthenticated: true })
    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    fireEvent.click(screen.getByRole('button', { name: /start timer/i }))

    expect(screen.getByLabelText(/activity kind/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument()
  })

  it('worker role: Stop button appears for Open entries', () => {
    useAuthStore.setState({ role: 'owner', user: 'worker-user', loaded: true, isAuthenticated: true })
    vi.spyOn(useProjectsHook, 'useProjectTimeEntries').mockReturnValue({
      data: OPEN_ENTRY,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectTimeEntries>)

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByRole('button', { name: /stop time entry/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit time entry/i })).not.toBeInTheDocument()
  })

  it('worker role: Submit button appears for Stopped entries', () => {
    useAuthStore.setState({ role: 'owner', user: 'worker-user', loaded: true, isAuthenticated: true })
    vi.spyOn(useProjectsHook, 'useProjectTimeEntries').mockReturnValue({
      data: STOPPED_ENTRY,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectTimeEntries>)

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByRole('button', { name: /submit time entry/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stop time entry/i })).not.toBeInTheDocument()
  })

  it('approver role: Start Timer button is absent', () => {
    useAuthStore.setState({ role: 'approver', user: 'approver-user', loaded: true, isAuthenticated: true })

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.queryByRole('button', { name: /start timer/i })).not.toBeInTheDocument()
  })

  it('approver role: approve and reject buttons are present for submitted entries', () => {
    useAuthStore.setState({ role: 'approver', user: 'approver-user', loaded: true, isAuthenticated: true })

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByRole('button', { name: /approve time entry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject time entry/i })).toBeInTheDocument()
  })

  it('approver role: clicking reject shows inline reason input with confirm and cancel', () => {
    useAuthStore.setState({ role: 'approver', user: 'approver-user', loaded: true, isAuthenticated: true })
    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    fireEvent.click(screen.getByRole('button', { name: /reject time entry/i }))

    expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve time entry/i })).not.toBeInTheDocument()
  })

  it('shows loading state while pending', () => {
    useAuthStore.setState({ role: 'owner', user: 'worker-user', loaded: true, isAuthenticated: true })
    vi.spyOn(useProjectsHook, 'useProjectTimeEntries').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectTimeEntries>)

    render(<ProjectTimePanel projectId="proj:dev-tenant/proj-001" />, { wrapper })
    expect(screen.getByText(/loading time entries/i)).toBeInTheDocument()
  })
})
