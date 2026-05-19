import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RentCollectionPage } from './RentCollectionPage'
import * as useLeaseHook from '@/hooks/useLeases'
import * as financialApi from '@/api/financial'
import type { LeaseSummary } from '@/api/leases'
import { PaymentError } from '@/api/financial'

// Bypass AuthRoleGate — render children unconditionally in tests
vi.mock('@/components/AuthRoleGate', () => ({
  AuthRoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_LEASES: LeaseSummary[] = [
  {
    leaseId: 'lease-ulid-0001',
    tenantDisplayName: 'Maria Santos',
    propertyId: 'prop-001',
    propertyDisplayName: '150 Lexington Ct',
    unitId: null,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyRent: 1250,
    status: 'Active',
  },
]

describe('RentCollectionPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders form fields with required indicators', () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)

    render(<RentCollectionPage />, { wrapper })
    expect(screen.getByText('Record Rent Payment')).toBeInTheDocument()
    expect(screen.getByLabelText(/lease \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount \(\$\) \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment date \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument()
  })

  it('shows confirmation view with audit-trail copy on successful submit', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)
    vi.spyOn(financialApi, 'recordPayment').mockResolvedValue({
      paymentId: 'pay_abc12345',
      status: 'Received',
      recordedAt: '2026-05-19T09:00:00Z',
    })

    render(<RentCollectionPage />, { wrapper })

    fireEvent.change(screen.getByLabelText(/lease \*/i), { target: { value: 'lease-ulid-0001' } })
    fireEvent.change(screen.getByLabelText(/amount \(\$\) \*/i), { target: { value: '1250' } })
    fireEvent.submit(screen.getByRole('button', { name: /record payment/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/payment recorded/i)).toBeInTheDocument()
      expect(screen.getByText(/audit-trail entry has been emitted/i)).toBeInTheDocument()
      expect(screen.getByText(/ref: pay_abc12345/i)).toBeInTheDocument()
      expect(screen.getByText('View lease history')).toBeInTheDocument()
    })
  })

  it('shows E1 (token-fetch-error) when CSRF endpoint unreachable', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)
    vi.spyOn(financialApi, 'recordPayment').mockRejectedValue(
      new PaymentError("Couldn't reach the payment service.", 'token-fetch-error'),
    )

    render(<RentCollectionPage />, { wrapper })
    fireEvent.change(screen.getByLabelText(/lease \*/i), { target: { value: 'lease-ulid-0001' } })
    fireEvent.change(screen.getByLabelText(/amount \(\$\) \*/i), { target: { value: '1250' } })
    fireEvent.submit(screen.getByRole('button', { name: /record payment/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/couldn't reach the payment service/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  it('shows E2 (token-rejection) with Reload page button', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)
    vi.spyOn(financialApi, 'recordPayment').mockRejectedValue(
      new PaymentError('Session expired.', 'token-rejection'),
    )

    render(<RentCollectionPage />, { wrapper })
    fireEvent.change(screen.getByLabelText(/lease \*/i), { target: { value: 'lease-ulid-0001' } })
    fireEvent.change(screen.getByLabelText(/amount \(\$\) \*/i), { target: { value: '1250' } })
    fireEvent.submit(screen.getByRole('button', { name: /record payment/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/session expired/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    })
  })

  it('shows E3 (lease-not-found) with generic message — DIAGNOSTIC-NON-LEAK invariant', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)
    vi.spyOn(financialApi, 'recordPayment').mockRejectedValue(
      new PaymentError("Couldn't find that lease.", 'lease-not-found'),
    )

    render(<RentCollectionPage />, { wrapper })
    fireEvent.change(screen.getByLabelText(/lease \*/i), { target: { value: 'lease-ulid-0001' } })
    fireEvent.change(screen.getByLabelText(/amount \(\$\) \*/i), { target: { value: '1250' } })
    fireEvent.submit(screen.getByRole('button', { name: /record payment/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/we couldn't find that lease/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /choose another lease/i })).toBeInTheDocument()
      // Verify diagnostic-non-leak: message must NOT reveal cross-tenant existence
      expect(screen.queryByText(/another tenant/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/different organization/i)).not.toBeInTheDocument()
    })
  })

  it('shows E4 (server-error) with generic Try again button', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)
    vi.spyOn(financialApi, 'recordPayment').mockRejectedValue(
      new PaymentError('Payment failed: 500', 'server-error'),
    )

    render(<RentCollectionPage />, { wrapper })
    fireEvent.change(screen.getByLabelText(/lease \*/i), { target: { value: 'lease-ulid-0001' } })
    fireEvent.change(screen.getByLabelText(/amount \(\$\) \*/i), { target: { value: '1250' } })
    fireEvent.submit(screen.getByRole('button', { name: /record payment/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  it('preserves form state (lease/amount/date/method) after E1/E4 error', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: MOCK_LEASES,
      isPending: false,
    } as unknown as ReturnType<typeof useLeaseHook.useLeases>)
    vi.spyOn(financialApi, 'recordPayment').mockRejectedValue(
      new PaymentError("Couldn't reach.", 'token-fetch-error'),
    )

    render(<RentCollectionPage />, { wrapper })
    const leaseSelect = screen.getByLabelText(/lease \*/i) as HTMLSelectElement
    const amountInput = screen.getByLabelText(/amount \(\$\) \*/i) as HTMLInputElement
    fireEvent.change(leaseSelect, { target: { value: 'lease-ulid-0001' } })
    fireEvent.change(amountInput, { target: { value: '1250' } })
    fireEvent.submit(amountInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/couldn't reach/i)).toBeInTheDocument()
    })
    // Form state preserved after error
    expect(leaseSelect.value).toBe('lease-ulid-0001')
    expect(amountInput.value).toBe('1250')
  })
})
