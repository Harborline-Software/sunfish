/**
 * ProjectBudgetPanel tests — test-eng F11 named render invariants.
 *
 * Named assertions:
 *   (a) current revision lines render with correct category names + amounts
 *   (b) budget-vs-actual rollup row is present and displays the actuals figure
 *   (c) "Add revision" affordance is present
 * Negative:
 *   if actuals data is absent (totalActual null), rollup renders as $0.00 (not a crash).
 *
 * NOTE: budget DTO shapes are deferred to Engineer PR 1 reconciliation (test-eng F9).
 * Update mock fixtures to match PR 1's actual ProjectBudget shapes before PR 4 opens.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ProjectBudgetPanel } from '../ProjectBudgetPanel'
import * as useProjectsHook from '@/hooks/useProjects'
import type { ProjectBudget } from '@/api/projects'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_BUDGET: ProjectBudget = {
  projectId: 'proj:dev-tenant/proj-001',
  currentRevision: {
    id: 'rev:001',
    effectiveDate: '2026-05-01',
    description: 'Initial estimate',
    lines: [
      { id: 'line:001', category: 'Labor', amount: 25000 },
      { id: 'line:002', category: 'Materials', amount: 15000 },
    ],
  },
  revisions: [],
  totalActual: 8500,
}

describe('ProjectBudgetPanel — test-eng F11 named invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('(a) renders current revision lines with category names and amounts', () => {
    vi.spyOn(useProjectsHook, 'useProjectBudget').mockReturnValue({
      data: MOCK_BUDGET,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectBudget>)

    render(<ProjectBudgetPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByText('Labor')).toBeInTheDocument()
    expect(screen.getByText('Materials')).toBeInTheDocument()
    expect(screen.getByText('$25,000.00')).toBeInTheDocument()
    expect(screen.getByText('$15,000.00')).toBeInTheDocument()
  })

  it('(b) budget-vs-actual rollup row is present and displays actuals figure', () => {
    vi.spyOn(useProjectsHook, 'useProjectBudget').mockReturnValue({
      data: MOCK_BUDGET,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectBudget>)

    render(<ProjectBudgetPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByText(/actuals/i)).toBeInTheDocument()
    expect(screen.getByText('$8,500.00')).toBeInTheDocument()
  })

  it('(c) "Add revision" affordance is present', () => {
    vi.spyOn(useProjectsHook, 'useProjectBudget').mockReturnValue({
      data: MOCK_BUDGET,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectBudget>)

    render(<ProjectBudgetPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByRole('button', { name: /add revision/i })).toBeInTheDocument()
  })

  it('negative: actuals absent (null) renders rollup as $0.00, not a crash', () => {
    vi.spyOn(useProjectsHook, 'useProjectBudget').mockReturnValue({
      data: { ...MOCK_BUDGET, totalActual: null },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectBudget>)

    render(<ProjectBudgetPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })

    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('shows loading state while pending', () => {
    vi.spyOn(useProjectsHook, 'useProjectBudget').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjectBudget>)

    render(<ProjectBudgetPanel projectId="proj:dev-tenant/proj-001" />, { wrapper })
    expect(screen.getByText(/loading budget/i)).toBeInTheDocument()
  })
})
