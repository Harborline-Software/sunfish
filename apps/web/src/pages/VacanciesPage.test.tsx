import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { VacanciesPage } from './VacanciesPage'
import * as useUnitsHooks from '@/hooks/useUnits'
import type { UnitList } from '@/api/units'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const VACANCY_LIST: UnitList = {
  units: [
    {
      unitId: 'unit:dev-tenant/unit-001',
      propertyId: 'prop:dev-tenant/prop-001',
      unitNumber: '1A',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
      occupancyStatus: 'Vacant',
      activeLease: null,
      notes: 'Corner unit.',
    },
    {
      unitId: 'unit:dev-tenant/unit-003',
      propertyId: 'prop:dev-tenant/prop-002',
      unitNumber: 'Main',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      occupancyStatus: 'Vacant',
      activeLease: null,
      notes: null,
    },
  ],
}

describe('VacanciesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('Loading vacancies…')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    const mockRefetch = vi.fn()
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('Failed to load vacancies')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('renders empty state when no vacancies', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: { units: [] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('No vacancies — all units are occupied')).toBeInTheDocument()
  })

  it('renders vacancy cards with unit details', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: VACANCY_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('Unit 1A')).toBeInTheDocument()
    expect(screen.getByText('Unit Main')).toBeInTheDocument()
    expect(screen.getByText('2 available units')).toBeInTheDocument()
  })

  it('links to unit detail page with encoded unitId', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: VACANCY_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    const links = screen.getAllByRole('link')
    const unitLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/units/'))
    expect(unitLinks.length).toBe(2)
    expect(unitLinks[0].getAttribute('href')).toBe(
      `/units/${encodeURIComponent('unit:dev-tenant/unit-001')}`,
    )
  })
})
