import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { UnitDetailPage } from './UnitDetailPage'
import * as useUnitsHooks from '@/hooks/useUnits'
import type { UnitDetail } from '@/api/units'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/units/unit%3Adev-tenant%2Funit-001']}>
        <Routes>
          <Route path="/units/:unitId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const OCCUPIED_UNIT: UnitDetail = {
  unitId: 'unit:dev-tenant/unit-001',
  propertyId: 'prop:dev-tenant/prop-001',
  unitNumber: '1A',
  bedrooms: 2,
  bathrooms: 1,
  squareFeet: 850,
  occupancyStatus: 'Occupied',
  activeLease: {
    leaseId: 'lease:dev-tenant/lease-001',
    endDate: '2025-01-31',
    monthlyRent: 1400,
  },
  notes: 'Corner unit.',
  lastInspection: { scheduledDate: '2024-03-15', phase: 'Move-out' },
  openWorkOrders: 2,
}

const VACANT_UNIT: UnitDetail = {
  unitId: 'unit:dev-tenant/unit-002',
  propertyId: 'prop:dev-tenant/prop-001',
  unitNumber: '2B',
  bedrooms: 1,
  bathrooms: 1,
  squareFeet: 620,
  occupancyStatus: 'Vacant',
  activeLease: null,
  notes: null,
  lastInspection: null,
  openWorkOrders: 0,
}

describe('UnitDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state', () => {
    vi.spyOn(useUnitsHooks, 'useUnit').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUnitsHooks.useUnit>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Loading unit…')).toBeInTheDocument()
  })

  it('renders error state with back link', () => {
    vi.spyOn(useUnitsHooks, 'useUnit').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Not found'),
    } as unknown as ReturnType<typeof useUnitsHooks.useUnit>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Failed to load unit')).toBeInTheDocument()
    const backLink = screen.getByRole('link', { name: '← Back to vacancies' })
    expect(backLink).toHaveAttribute('href', '/vacancies')
  })

  it('renders occupied unit with active lease and inspection', () => {
    vi.spyOn(useUnitsHooks, 'useUnit').mockReturnValue({
      data: OCCUPIED_UNIT,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUnitsHooks.useUnit>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Unit 1A')).toBeInTheDocument()
    expect(screen.getByText('Occupied')).toBeInTheDocument()
    expect(screen.getByText('$1,400')).toBeInTheDocument()
    expect(screen.getByText('Move-out')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Corner unit.')).toBeInTheDocument()
  })

  it('renders vacant unit with no lease or inspection cards', () => {
    vi.spyOn(useUnitsHooks, 'useUnit').mockReturnValue({
      data: VACANT_UNIT,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUnitsHooks.useUnit>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Unit 2B')).toBeInTheDocument()
    expect(screen.getByText('Vacant')).toBeInTheDocument()
    expect(screen.queryByText('Active Lease')).not.toBeInTheDocument()
    expect(screen.queryByText('Last Inspection')).not.toBeInTheDocument()
  })

  it('renders MaintenanceHold unit with Reserved badge', () => {
    const reservedUnit: UnitDetail = {
      ...VACANT_UNIT,
      occupancyStatus: 'Reserved',
    }
    vi.spyOn(useUnitsHooks, 'useUnit').mockReturnValue({
      data: reservedUnit,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUnitsHooks.useUnit>)

    render(<UnitDetailPage />, { wrapper })
    expect(screen.getByText('Maintenance Hold')).toBeInTheDocument()
  })
})
