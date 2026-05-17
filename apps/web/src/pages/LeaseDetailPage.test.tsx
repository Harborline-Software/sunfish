import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LeaseDetailPage } from './LeaseDetailPage'
import * as useLeaseHook from '@/hooks/useLeases'
import type { LeaseDetail } from '@/api/leases'  // W#74 PR 2 — rebound from @/api/erpnext

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/leases/lease-ulid-0001']}>
        <Routes>
          <Route path="/leases/:name" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_DETAIL: LeaseDetail = {
  leaseId: 'lease-ulid-0001',
  tenantDisplayName: 'Jane Smith',
  propertyId: 'prop-001',
  propertyDisplayName: '150 Lexington Ct',
  unitId: 'unit-1',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  monthlyRent: 1500,
  status: 'Active',
  securityDeposit: null,
  leaseTerm: null,
  tenants: [{ partyId: 'party-jane', displayName: 'Jane Smith' }],
  notes: null,
}

describe('LeaseDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state while pending', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: undefined,
      isPending: true,
    } as unknown as ReturnType<typeof useLeaseHook.usePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText(/loading lease/i)).toBeInTheDocument()
  })

  it('renders lease detail fields with new DTO shape', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.usePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('150 Lexington Ct')).toBeInTheDocument()
    expect(screen.getByText('2025-01-01')).toBeInTheDocument()
    expect(screen.getByText('2025-12-31')).toBeInTheDocument()
    expect(screen.getByText('$1,500')).toBeInTheDocument()
  })

  it('shows error state when lease fetch fails', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Lease not found'),
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: undefined,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.usePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText(/failed to load lease/i)).toBeInTheDocument()
    expect(screen.getByText('Lease not found')).toBeInTheDocument()
  })

  it('shows payments regression banner when no payments match (known Cohort 2 gap)', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    // No payments for this lease in ERPNext format — expected gap until Cohort 2 RB-8
    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.usePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText(/payment history will appear after the next migration step/i)).toBeInTheDocument()
  })

  it('renders unit when present', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.usePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText('unit-1')).toBeInTheDocument()
  })

  it('shows property fallback when propertyDisplayName is null', () => {
    const noDisplayName: LeaseDetail = {
      ...MOCK_DETAIL,
      propertyDisplayName: null,
      propertyId: 'prop-raw-id',
    }
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: noDisplayName,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.usePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText('prop-raw-id')).toBeInTheDocument()
  })
})
