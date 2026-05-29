import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { UnitDetailPage } from './UnitDetailPage'
import * as useUnitsHooks from '@/hooks/useUnits'
import { UnitNotFoundError } from '@/api/units'
import type { UnitDetail } from '@/api/units'

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

const mockGoBack = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockGoBack,
    useParams: () => ({ unitId: 'unit-101' }),
  }
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/units/unit-101']}>
        <Routes>
          <Route path="/units/:unitId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const OCCUPIED_UNIT: UnitDetail = {
  unitId: 'unit-101',
  unitNumber: '101',
  propertyId: 'prop-abc',
  propertyDisplayName: 'Maple Apartments',
  bedrooms: 2,
  bathrooms: 1,
  squareFeet: 850,
  occupancyStatus: 'Occupied',
  activeLease: {
    leaseId: 'lease-xyz',
    tenantDisplayName: 'Jane Smith',
    monthlyRent: 1400,
    startDate: '2025-01-01',
    endDate: '2099-12-31',
  },
  lastInspectionDate: '2026-03-15',
  lastInspectionResult: 'Passed',
  openWorkOrderCount: 2,
}

const VACANT_UNIT: UnitDetail = {
  ...OCCUPIED_UNIT,
  unitId: 'unit-202',
  unitNumber: '202',
  occupancyStatus: 'Vacant',
  activeLease: null,
  lastInspectionDate: null,
  lastInspectionResult: null,
  openWorkOrderCount: 0,
}

describe('UnitDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGoBack.mockClear()
  })

  it('renders loading state', () => {
    vi.spyOn(useUnitsHooks, 'useUnitDetail').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useUnitDetail>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByText('Loading unit…')).toBeInTheDocument()
  })

  it('renders 404 state for UnitNotFoundError', () => {
    vi.spyOn(useUnitsHooks, 'useUnitDetail').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new UnitNotFoundError('unit-101'),
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useUnitDetail>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Unit not found.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Go back'))
    expect(mockGoBack).toHaveBeenCalledWith(-1)
  })

  it('renders generic error state', () => {
    const mockRefetch = vi.fn()
    vi.spyOn(useUnitsHooks, 'useUnitDetail').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
    } as ReturnType<typeof useUnitsHooks.useUnitDetail>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByTestId('error-card')).toBeInTheDocument()
    expect(screen.getByText('Failed to load unit')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('renders occupied unit with all details', () => {
    vi.spyOn(useUnitsHooks, 'useUnitDetail').mockReturnValue({
      data: OCCUPIED_UNIT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useUnitDetail>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Unit 101')).toBeInTheDocument()
    expect(screen.getByText('Maple Apartments')).toBeInTheDocument()
    expect(screen.getByText('2 bedrooms · 1 bathroom · 850 ft²')).toBeInTheDocument()
    // Occupancy badge
    expect(screen.getByText('Occupied')).toBeInTheDocument()
    // Active lease
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('$1,400/mo')).toBeInTheDocument()
    // Open work orders
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('View maintenance →')).toBeInTheDocument()
  })

  it('renders vacant unit with empty lease + no inspection', () => {
    vi.spyOn(useUnitsHooks, 'useUnitDetail').mockReturnValue({
      data: VACANT_UNIT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useUnitDetail>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Vacant')).toBeInTheDocument()
    expect(screen.getByText('No active lease')).toBeInTheDocument()
    expect(screen.getByText('No inspections on record')).toBeInTheDocument()
    // 0 work orders — no "View maintenance" link
    expect(screen.queryByText('View maintenance →')).not.toBeInTheDocument()
  })

  it('shows last inspection result when present', () => {
    vi.spyOn(useUnitsHooks, 'useUnitDetail').mockReturnValue({
      data: OCCUPIED_UNIT,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useUnitsHooks.useUnitDetail>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Passed')).toBeInTheDocument()
  })
})
