import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProjectListView } from '../ProjectListView'
import * as useProjectsHook from '@/hooks/useProjects'
import type { ProjectList } from '@/api/projects'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/cockpit/projects']}>
        <Routes>
          <Route path="/cockpit/projects" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_LIST: ProjectList = {
  projects: [
    {
      id: 'proj:dev-tenant/proj-001',
      code: 'PROJ-001',
      name: 'Roof Replacement',
      status: 'InProgress',
      kind: 'Maintenance',
    },
    {
      id: 'proj:dev-tenant/proj-002',
      code: 'PROJ-002',
      name: 'HVAC Upgrade',
      status: 'Planned',
      kind: 'CapEx',
    },
  ],
}

describe('ProjectListView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state while pending', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjects>)

    render(<ProjectListView />, { wrapper })
    expect(screen.getByText(/loading projects/i)).toBeInTheDocument()
  })

  it('renders project rows with DTO field names', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      data: MOCK_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjects>)

    render(<ProjectListView />, { wrapper })
    expect(screen.getByText('Roof Replacement')).toBeInTheDocument()
    expect(screen.getByText('HVAC Upgrade')).toBeInTheDocument()
    expect(screen.getByText('PROJ-001')).toBeInTheDocument()
    expect(screen.getByText('InProgress')).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })

  it('shows project count', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      data: MOCK_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjects>)

    render(<ProjectListView />, { wrapper })
    expect(screen.getByText(/2 projects/i)).toBeInTheDocument()
  })

  it('shows empty state when no projects', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      data: { projects: [] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectsHook.useProjects>)

    render(<ProjectListView />, { wrapper })
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Bridge unreachable'),
      refetch,
    } as unknown as ReturnType<typeof useProjectsHook.useProjects>)

    render(<ProjectListView />, { wrapper })
    expect(screen.getByText(/bridge unreachable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
