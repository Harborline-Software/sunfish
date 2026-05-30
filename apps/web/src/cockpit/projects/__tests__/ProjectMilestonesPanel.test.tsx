/**
 * ProjectMilestonesPanel tests — test-eng F11 named render invariants.
 *
 * Named assertions:
 *   (a) milestone rows render in the correct order (order as returned)
 *   (b) predecessor edges are visually indicated when predecessorMilestoneId is non-null
 *   (c) achieved milestones are distinguished from pending milestones
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ProjectMilestonesPanel } from '../ProjectMilestonesPanel'
import * as useProjectsHook from '@/hooks/useProjects'
import type { ProjectMilestoneList } from '@/api/projects'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_MILESTONES: ProjectMilestoneList = {
  milestones: [
    {
      id: 'ms:001',
      code: 'MS-001',
      name: 'Site survey',
      kind: 'Checkpoint',
      status: 'Achieved',
      plannedDate: '2026-04-15',
      actualDate: '2026-04-14',
      predecessorMilestoneId: null,
    },
    {
      id: 'ms:002',
      code: 'MS-002',
      name: 'Foundation work',
      kind: 'Phase',
      status: 'Pending',
      plannedDate: '2026-05-01',
      actualDate: null,
      predecessorMilestoneId: 'ms:001',
    },
  ],
}

describe('ProjectMilestonesPanel — test-eng F11 named invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('(a) milestone rows render in the returned order', () => {
    vi.spyOn(useProjectsHook, 'useProjectMilestones').mockReturnValue({
      data: MOCK_MILESTONES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectMilestones>)

    render(<ProjectMilestonesPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    const rows = screen.getAllByRole('row')
    // header + 2 data rows
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('MS-001')
    expect(rows[2]).toHaveTextContent('MS-002')
  })

  it('(b) predecessor edges are indicated for milestones with predecessorMilestoneId', () => {
    vi.spyOn(useProjectsHook, 'useProjectMilestones').mockReturnValue({
      data: MOCK_MILESTONES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectMilestones>)

    render(<ProjectMilestonesPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    // MS-002 has predecessorMilestoneId = 'ms:001' (code = MS-001)
    expect(screen.getByLabelText(/depends on ms-001/i)).toBeInTheDocument()
  })

  it('(c) achieved milestones are distinguished from pending (strikethrough/green badge)', () => {
    vi.spyOn(useProjectsHook, 'useProjectMilestones').mockReturnValue({
      data: MOCK_MILESTONES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectMilestones>)

    const { container } = render(<ProjectMilestonesPanel projectId="proj:dev-tenant/proj-001" />, {
      wrapper,
    })

    // Achieved badge
    const achievedBadge = screen.getByText('Achieved')
    expect(achievedBadge).toHaveClass('bg-green-100')

    // Achieved row name has line-through styling
    const achievedName = container.querySelector('.line-through')
    expect(achievedName).toBeInTheDocument()
    expect(achievedName?.textContent).toBe('Site survey')
  })

  it('shows empty state when no milestones', () => {
    vi.spyOn(useProjectsHook, 'useProjectMilestones').mockReturnValue({
      data: { milestones: [] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectMilestones>)

    render(<ProjectMilestonesPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })
    expect(screen.getByText(/no milestones yet/i)).toBeInTheDocument()
  })
})
