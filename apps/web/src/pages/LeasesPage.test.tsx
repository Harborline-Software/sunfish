import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LeasesPage } from './LeasesPage'
import * as useLeaseHook from '@/hooks/useLeases'
import type { LeaseSummary } from '@/api/leases'  // rebound from @/api/erpnext — W#74 PR 2

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/leases']}>
        <Routes>
          <Route path="/leases" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_LEASES: LeaseSummary[] = [
  {
    leaseId: 'lease-ulid-0001',
    tenantDisplayName: 'Jane Smith',
    propertyId: 'prop-001',
    propertyDisplayName: '150 Lexington Ct',
    unitId: 'unit-1',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyRent: 1500,
    status: 'Active',
  },
  {
    leaseId: 'lease-ulid-0002',
    tenantDisplayName: 'Bob Jones',
    propertyId: 'prop-002',
    propertyDisplayName: '200 Oak Ave',
    unitId: null,
    startDate: '2024-06-01',
    endDate: '2024-12-31',
    monthlyRent: 2000,
    status: 'Expired',
  },
]

describe('LeasesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state while pending', () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)

    render(<LeasesPage />, { wrapper })
    expect(screen.getByText(/loading leases/i)).toBeInTheDocument()
  })

  it('renders lease rows with new DTO field names', () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)

    render(<LeasesPage />, { wrapper })
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText('$1,500')).toBeInTheDocument()
    expect(screen.getByText('$2,000')).toBeInTheDocument()
    // propertyDisplayName renders instead of legacy property field
    expect(screen.getByText('150 Lexington Ct')).toBeInTheDocument()
  })

  it('renders property fallback when propertyDisplayName is null', () => {
    const noName: LeaseSummary = {
      ...MOCK_LEASES[0],
      leaseId: 'L-X',
      propertyDisplayName: null,
      propertyId: 'prop-fallback',
    }
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: [noName],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)

    render(<LeasesPage />, { wrapper })
    expect(screen.getByText('prop-fallback')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)

    render(<LeasesPage />, { wrapper })
    expect(screen.getByText(/failed to load leases/i)).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('shows updated empty-state copy (no ERPNext reference)', () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)

    render(<LeasesPage />, { wrapper })
    expect(screen.getByText(/no leases found/i)).toBeInTheDocument()
    expect(screen.getByText(/add a lease in the cockpit/i)).toBeInTheDocument()
    // The old ERPNext copy must not appear
    expect(screen.queryByText(/ERPNext/i)).not.toBeInTheDocument()
  })
})
