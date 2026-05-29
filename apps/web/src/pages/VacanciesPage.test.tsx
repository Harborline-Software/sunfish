import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { VacanciesPage } from './VacanciesPage'
import * as useUnitsHooks from '@/hooks/useUnits'
import type { VacancyList } from '@/api/units'

vi.mock('@sunfish/ui-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sunfish/ui-react')>()
  return {
    ...actual,
    ErrorCard: ({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) => (
      <div role="alert" data-testid="error-card">
        {title}
        {message && <span>{message}</span>}
        {onRetry && <button onClick={onRetry}>Retry</button>}
      </div>
    ),
    LoadingState: ({ label }: { label: string }) => (
      <div data-testid="loading-state">{label}</div>
    ),
  }
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/vacancies']}>
        <Routes>
          <Route path="/vacancies" element={children} />
          <Route path="/units/:unitId" element={<div>unit-detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_VACANCIES: VacancyList = {
  totalCount: 2,
  vacancies: [
    {
      unitId: 'unit-101',
      unitNumber: '101',
      propertyId: 'prop-abc',
      propertyDisplayName: 'Maple Apartments',
      propertyAddress: '100 Maple St, Portland, OR',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
      lastVacatedDate: '2026-04-01',
      daysVacant: 58,
      askingRent: 1400,
      listingStatus: 'Listed',
    },
    {
      unitId: 'unit-202',
      unitNumber: '202',
      propertyId: 'prop-def',
      propertyDisplayName: 'Oak Street House',
      propertyAddress: '200 Oak St, Portland, OR',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 600,
      lastVacatedDate: null,
      daysVacant: 0,
      askingRent: null,
      listingStatus: 'Unlisted',
    },
  ],
}

describe('VacanciesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockClear()
  })

  it('renders loading state', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByText('Loading vacancies…')).toBeInTheDocument()
  })

  it('renders error state with retry', () => {
    const mockRefetch = vi.fn()
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByTestId('error-card')).toBeInTheDocument()
    expect(screen.getByText('Failed to load vacancies')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('renders empty state when no vacancies', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: { vacancies: [], totalCount: 0 },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('Vacancies')).toBeInTheDocument()
    expect(screen.getByText('All units are currently occupied.')).toBeInTheDocument()
    expect(screen.getByText(/No vacancies/)).toBeInTheDocument()
  })

  it('renders vacancy table rows', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: MOCK_VACANCIES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('2 vacant units')).toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText('Maple Apartments')).toBeInTheDocument()
    expect(screen.getByText('202')).toBeInTheDocument()
    expect(screen.getByText('Oak Street House')).toBeInTheDocument()
    // Days vacant: 58 days
    expect(screen.getByText('58 days')).toBeInTheDocument()
    // Asking rent: $1,400/mo
    expect(screen.getByText('$1,400/mo')).toBeInTheDocument()
    // Unlisted for unit 202
    expect(screen.getAllByText('Unlisted').length).toBeGreaterThanOrEqual(1)
    // Listed badge for unit 101
    expect(screen.getByText('Listed')).toBeInTheDocument()
  })

  it('navigates to unit detail on row click', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: MOCK_VACANCIES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    const row = screen.getByRole('button', { name: /Unit 101/ })
    fireEvent.click(row)
    expect(mockNavigate).toHaveBeenCalledWith('/units/unit-101')
  })

  it('navigates on Enter keydown', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: MOCK_VACANCIES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    const row = screen.getByRole('button', { name: /Unit 101/ })
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(mockNavigate).toHaveBeenCalledWith('/units/unit-101')
  })

  it('shows "Today" when unit was vacated today (daysVacant === 0)', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: MOCK_VACANCIES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows "—" when asking rent is null', () => {
    vi.spyOn(useUnitsHooks, 'useVacancies').mockReturnValue({
      data: MOCK_VACANCIES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useVacancies>)

    render(<VacanciesPage />, { wrapper })
    // Unit 202 has no asking rent — should render em-dash
    const rentCells = screen.getAllByRole('cell')
    const dashCell = rentCells.find((c) => c.textContent === '—')
    expect(dashCell).toBeTruthy()
  })
})
