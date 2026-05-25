import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountingPage } from './AccountingPage'
import * as useAccountingHook from '@/hooks/useAccounting'
import type { AccountingSummary, OutstandingInvoiceList } from '@/api/financial'  // W#76 PR 2 — RB-7

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const MOCK_SUMMARY: AccountingSummary = {
  invoicedThisPeriod: 48500,
  receivedThisPeriod: 42250,
  outstanding: 6250,
  outstanding30Plus: 1200,
  aging60Plus: 450,
  aging60PlusCount: 2,
  currency: 'USD',
}

const EMPTY_OUTSTANDING: OutstandingInvoiceList = { items: [], total: 0 }

const MOCK_OUTSTANDING: OutstandingInvoiceList = {
  items: [
    {
      invoiceId: 'inv_abcd1234',
      leaseId: 'lease-ulid-0001',
      tenantDisplayName: 'Maria Smith',
      amount: 1250,
      currency: 'USD',
      daysOverdue: 32,
    },
    {
      invoiceId: 'inv_efgh5678',
      leaseId: 'lease-ulid-0002',
      tenantDisplayName: 'John Williams',
      amount: 1200,
      currency: 'USD',
      daysOverdue: 15,
    },
  ],
  total: 2,
}

describe('AccountingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading skeleton when either query is pending', () => {
    vi.spyOn(useAccountingHook, 'useAccountingSummary').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingSummary>)
    vi.spyOn(useAccountingHook, 'useAccountingOutstanding').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingOutstanding>)

    render(<AccountingPage />, { wrapper })
    expect(screen.getByText('Accounting')).toBeInTheDocument()
    expect(screen.getByText('Summary of your receivables')).toBeInTheDocument()
    const busyElements = document.querySelectorAll('[aria-busy="true"]')
    expect(busyElements.length).toBeGreaterThan(0)
  })

  it('shows error state with retry button when either query fails', () => {
    vi.spyOn(useAccountingHook, 'useAccountingSummary').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingSummary>)
    vi.spyOn(useAccountingHook, 'useAccountingOutstanding').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingOutstanding>)

    render(<AccountingPage />, { wrapper })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/couldn't load accounting data/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders all 4 summary tiles with formatted amounts', () => {
    vi.spyOn(useAccountingHook, 'useAccountingSummary').mockReturnValue({
      data: MOCK_SUMMARY,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingSummary>)
    vi.spyOn(useAccountingHook, 'useAccountingOutstanding').mockReturnValue({
      data: EMPTY_OUTSTANDING,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingOutstanding>)

    render(<AccountingPage />, { wrapper })
    expect(screen.getByText('Invoiced')).toBeInTheDocument()
    expect(screen.getByText('$48,500.00')).toBeInTheDocument()
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('$42,250.00')).toBeInTheDocument()
    expect(screen.getByText('Outstanding')).toBeInTheDocument()
    expect(screen.getByText('$6,250.00')).toBeInTheDocument()
    expect(screen.getByText('Aging 60+')).toBeInTheDocument()
    expect(screen.getByText('$450.00')).toBeInTheDocument()
    expect(screen.getByText('2 invoices')).toBeInTheDocument()
  })

  it('shows empty state when no outstanding invoices (cross-tenant also returns empty)', () => {
    vi.spyOn(useAccountingHook, 'useAccountingSummary').mockReturnValue({
      data: MOCK_SUMMARY,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingSummary>)
    vi.spyOn(useAccountingHook, 'useAccountingOutstanding').mockReturnValue({
      data: EMPTY_OUTSTANDING,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingOutstanding>)

    render(<AccountingPage />, { wrapper })
    expect(screen.getByText(/no outstanding invoices/i)).toBeInTheDocument()
  })

  it('renders invoice rows with ID slice, tenant name, amount, and days-due pill', () => {
    vi.spyOn(useAccountingHook, 'useAccountingSummary').mockReturnValue({
      data: MOCK_SUMMARY,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingSummary>)
    vi.spyOn(useAccountingHook, 'useAccountingOutstanding').mockReturnValue({
      data: MOCK_OUTSTANDING,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingOutstanding>)

    render(<AccountingPage />, { wrapper })
    expect(screen.getByText('abcd1234')).toBeInTheDocument() // last 8 of 'inv_abcd1234'
    expect(screen.getByText('Maria Smith')).toBeInTheDocument()
    expect(screen.getByText('$1,250.00')).toBeInTheDocument()
    expect(screen.getByText('efgh5678')).toBeInTheDocument() // last 8 of 'inv_efgh5678'
    expect(screen.getByText('John Williams')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
  })

  it('applies yellow pill for 31-60 day overdue invoices', () => {
    vi.spyOn(useAccountingHook, 'useAccountingSummary').mockReturnValue({
      data: MOCK_SUMMARY,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingSummary>)
    vi.spyOn(useAccountingHook, 'useAccountingOutstanding').mockReturnValue({
      data: MOCK_OUTSTANDING,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAccountingHook.useAccountingOutstanding>)

    render(<AccountingPage />, { wrapper })
    // inv_abcd1234 has daysOverdue: 32 → yellow pill
    const yellowPill = screen.getByText('32 days')
    expect(yellowPill).toHaveClass('bg-yellow-100')
    // inv_efgh5678 has daysOverdue: 15 → no pill (plain text)
    const plainText = screen.getByText('15 days')
    expect(plainText).not.toHaveClass('bg-yellow-100')
    expect(plainText).not.toHaveClass('bg-orange-100')
    expect(plainText).not.toHaveClass('bg-red-100')
  })
})
