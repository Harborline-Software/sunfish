import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LeaseDetailPage } from './LeaseDetailPage'
import * as useLeaseHook from '@/hooks/useLeases'
import type { LeaseDetail } from '@/api/leases'  // W#74 PR 2 — rebound from @/api/erpnext
import type { PaymentList } from '@/api/financial'  // W#76 PR 1 — RB-8

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

const EMPTY_PAYMENTS: PaymentList = { items: [], total: 0, page: 1, pageSize: 20 }

const MOCK_PAYMENTS: PaymentList = {
  items: [
    {
      paymentId: 'pay_abcd1234',
      leaseId: 'lease-ulid-0001',
      receivedAt: '2026-05-01T00:00:00Z',
      amount: 1250,
      currency: 'USD',
      direction: 'Inbound',
      paymentMethod: 'ACH',
      status: 'Completed',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
}

describe('LeaseDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state while lease is pending', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

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
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: EMPTY_PAYMENTS,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

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
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText(/failed to load lease/i)).toBeInTheDocument()
    expect(screen.getByText('Lease not found')).toBeInTheDocument()
  })

  it('shows empty state when no payments exist (cross-tenant also returns empty)', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: EMPTY_PAYMENTS,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText(/no payments recorded yet for this lease/i)).toBeInTheDocument()
    expect(screen.getByText(/record the first payment/i)).toBeInTheDocument()
  })

  it('shows payments error state with retry button', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText(/couldn't load payment history/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders payment rows with new DTO field names', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: MOCK_PAYMENTS,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText('abcd1234')).toBeInTheDocument() // last 8 chars of 'pay_abcd1234'
    expect(screen.getByText('2026-05-01')).toBeInTheDocument()
    expect(screen.getByText('$1,250')).toBeInTheDocument()
    expect(screen.getByText('ACH')).toBeInTheDocument()
    expect(screen.getByText('+ Record a new payment')).toBeInTheDocument()
  })

  it('renders unit when present', () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: MOCK_DETAIL,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useLeaseHook.useLease>)
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: EMPTY_PAYMENTS,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

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
    vi.spyOn(useLeaseHook, 'useLeasePayments').mockReturnValue({
      data: EMPTY_PAYMENTS,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLeaseHook.useLeasePayments>)

    render(<LeaseDetailPage />, { wrapper })
    expect(screen.getByText('prop-raw-id')).toBeInTheDocument()
  })
})
