/**
 * ProfitAndLossByPropertyPage unit tests — cohort-3 PR 3
 *
 * Coverage shape (per dispatch):
 *  - happy path: renders heading + property accordion on SUCCESS
 *  - loading skeleton renders while mutation isPending
 *  - provisional banner renders when isProvisional=true
 *  - CSV export button click calls exportProfitAndLossByPropertyCsv
 *  - error surface renders on mutation failure
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ProfitAndLossByPropertyPage } from './ProfitAndLossByPropertyPage'
import * as useReportsHook from '@/hooks/useReports'
import * as reportsApi from '@/api/reports'
import type { ProfitAndLossByPropertyResult } from '@/api/reports'

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const MOCK_PL_RESULT: ProfitAndLossByPropertyResult = {
  chartId: 'chart-abc',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  byProperty: [
    {
      propertyKey: 'PROP-001',
      totalRevenue: 15000,
      totalExpenses: 5000,
      netIncome: 10000,
      revenueLines: [
        { accountId: 'acc-1', accountCode: '4000', accountName: 'Rent Income', amount: 15000 },
      ],
      expenseLines: [
        { accountId: 'acc-2', accountCode: '6000', accountName: 'Repairs', amount: 5000 },
      ],
    },
  ],
  totals: {
    totalRevenue: 15000,
    totalExpenses: 5000,
    netIncome: 10000,
  },
}

const MOCK_MUTATION_IDLE = {
  isPending: false,
  isError: false,
  isSuccess: false,
  status: 'idle',
  mutate: vi.fn(),
  reset: vi.fn(),
  data: undefined,
  error: null,
}

const MOCK_MUTATION_PENDING = {
  ...MOCK_MUTATION_IDLE,
  isPending: true,
  status: 'pending',
}

const MOCK_MUTATION_SUCCESS = {
  ...MOCK_MUTATION_IDLE,
  isSuccess: true,
  status: 'success',
  data: {
    kind: 'profit-and-loss-by-property',
    result: MOCK_PL_RESULT,
    runAtUtc: '2026-05-25T17:00:00Z',
    snapshotMarker: 'snap-001',
    runDuration: '00:00:01',
    isProvisional: false,
    warnings: [],
  },
}

const MOCK_MUTATION_PROVISIONAL = {
  ...MOCK_MUTATION_SUCCESS,
  data: {
    ...MOCK_MUTATION_SUCCESS.data,
    isProvisional: true,
    warnings: ['Ledger entries pending approval'],
  },
}

const MOCK_MUTATION_ERROR = {
  ...MOCK_MUTATION_IDLE,
  isError: true,
  status: 'error',
  error: new Error('Network error'),
}

const MOCK_CHARTS_ONE = {
  data: { charts: [{ chartId: 'chart-abc', name: 'Main Chart', baseCurrency: 'USD' }] },
  isPending: false,
  isError: false,
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfitAndLossByPropertyPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useReportsHook, 'useCharts').mockReturnValue(
      MOCK_CHARTS_ONE as unknown as ReturnType<typeof useReportsHook.useCharts>
    )
  })

  it('renders page heading in IDLE state', () => {
    vi.spyOn(useReportsHook, 'useProfitAndLossByProperty').mockReturnValue(
      MOCK_MUTATION_IDLE as unknown as ReturnType<typeof useReportsHook.useProfitAndLossByProperty>
    )
    render(<ProfitAndLossByPropertyPage />, { wrapper })
    expect(screen.getByRole('heading', { name: /profit.*loss by property/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run report/i })).toBeInTheDocument()
  })

  it('shows skeleton loader while report is running', () => {
    vi.spyOn(useReportsHook, 'useProfitAndLossByProperty').mockReturnValue(
      MOCK_MUTATION_PENDING as unknown as ReturnType<typeof useReportsHook.useProfitAndLossByProperty>
    )
    render(<ProfitAndLossByPropertyPage />, { wrapper })
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('renders property accordion sections on success', async () => {
    vi.spyOn(useReportsHook, 'useProfitAndLossByProperty').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useProfitAndLossByProperty>
    )
    render(<ProfitAndLossByPropertyPage />, { wrapper })

    // Property key should appear
    expect(await screen.findByText(/PROP-001/)).toBeInTheDocument()
  })

  it('renders provisionality banner when result is provisional', () => {
    vi.spyOn(useReportsHook, 'useProfitAndLossByProperty').mockReturnValue(
      MOCK_MUTATION_PROVISIONAL as unknown as ReturnType<typeof useReportsHook.useProfitAndLossByProperty>
    )
    render(<ProfitAndLossByPropertyPage />, { wrapper })
    expect(screen.getByText(/provisional report/i)).toBeInTheDocument()
  })

  it('renders error surface on mutation failure', () => {
    vi.spyOn(useReportsHook, 'useProfitAndLossByProperty').mockReturnValue(
      MOCK_MUTATION_ERROR as unknown as ReturnType<typeof useReportsHook.useProfitAndLossByProperty>
    )
    render(<ProfitAndLossByPropertyPage />, { wrapper })
    expect(screen.getByText(/couldn't run profit.*loss report/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls exportProfitAndLossByPropertyCsv when Export CSV is clicked after a run', async () => {
    const mockExport = vi.spyOn(reportsApi, 'exportProfitAndLossByPropertyCsv').mockResolvedValue(undefined)
    vi.spyOn(useReportsHook, 'useProfitAndLossByProperty').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useProfitAndLossByProperty>
    )
    render(<ProfitAndLossByPropertyPage />, { wrapper })

    // Click Run report first so submittedParams is set (required for export guard)
    const runBtn = screen.getByRole('button', { name: /run report/i })
    fireEvent.click(runBtn)

    const exportBtn = screen.getByRole('button', { name: /export csv/i })
    fireEvent.click(exportBtn)
    await waitFor(() => expect(mockExport).toHaveBeenCalledOnce())
  })
})
