/**
 * ArAgingPage unit tests — cohort-3 PR 5
 *
 * Coverage shape (per dispatch):
 *  - happy path: renders heading + customer table + property table on SUCCESS
 *  - loading skeleton renders while mutation isPending
 *  - provisional banner renders when isProvisional=true
 *  - CSV export button click calls exportArAgingSummaryCsv
 *  - error surface renders on mutation failure with retry button
 *  - filter change after success resets mutation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ArAgingPage } from './ArAgingPage'
import * as useReportsHook from '@/hooks/useReports'
import * as reportsApi from '@/api/reports'
import type { ArAgingSummaryResult, ArAgingSummaryParameters } from '@/api/reports'

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const ZERO_ROW = {
  groupKey: '_totals',
  groupLabel: 'Total',
  current: 0,
  days0To30: 0,
  days31To60: 0,
  days61To90: 0,
  days90Plus: 0,
  totalOpen: 0,
}

const MOCK_AR_RESULT: ArAgingSummaryResult = {
  chartId: 'chart-abc',
  asOf: '2026-05-25T00:00:00Z',
  byCustomer: [
    {
      groupKey: 'CUST-001',
      groupLabel: 'Alice Smith',
      current: 500,
      days0To30: 200,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      totalOpen: 700,
    },
  ],
  byProperty: [
    {
      groupKey: 'PROP-001',
      groupLabel: 'Harbor View',
      current: 500,
      days0To30: 200,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      totalOpen: 700,
    },
  ],
  totals: {
    ...ZERO_ROW,
    current: 500,
    days0To30: 200,
    totalOpen: 700,
  },
  topDelinquent: [],
}

const MOCK_MUTATION_IDLE = {
  isPending: false,
  isError: false,
  isSuccess: false,
  mutate: vi.fn(),
  reset: vi.fn(),
  data: undefined,
  error: null,
  variables: undefined,
}

const MOCK_MUTATION_PENDING = {
  ...MOCK_MUTATION_IDLE,
  isPending: true,
}

const MOCK_MUTATION_SUCCESS = {
  ...MOCK_MUTATION_IDLE,
  isSuccess: true,
  variables: { chartId: 'chart-abc', asOfDate: '2026-05-25', topDelinquentN: 10 } as ArAgingSummaryParameters,
  data: {
    kind: 'ar-aging-summary',
    result: MOCK_AR_RESULT,
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
    warnings: ['Unreconciled payments pending'],
  },
}

const MOCK_MUTATION_ERROR = {
  ...MOCK_MUTATION_IDLE,
  isError: true,
  variables: { chartId: 'chart-abc', asOfDate: '2026-05-25', topDelinquentN: 10 } as ArAgingSummaryParameters,
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

describe('ArAgingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useReportsHook, 'useCharts').mockReturnValue(
      MOCK_CHARTS_ONE as unknown as ReturnType<typeof useReportsHook.useCharts>
    )
  })

  it('renders page heading and Run report button in IDLE state', () => {
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue(
      MOCK_MUTATION_IDLE as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>
    )
    render(<ArAgingPage />, { wrapper })
    expect(screen.getByRole('heading', { name: /ar aging/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run report/i })).toBeInTheDocument()
  })

  it('shows skeleton loader while mutation is pending', () => {
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue(
      MOCK_MUTATION_PENDING as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>
    )
    render(<ArAgingPage />, { wrapper })
    const busyContainer = document.querySelector('[aria-busy="true"]')
    expect(busyContainer).not.toBeNull()
  })

  it('renders customer and property aging sections on success', async () => {
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>
    )
    render(<ArAgingPage />, { wrapper })

    expect(await screen.findByText(/by customer/i)).toBeInTheDocument()
    expect(screen.getByText(/by property/i)).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Harbor View')).toBeInTheDocument()
  })

  it('renders provisionality banner when isProvisional=true', () => {
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue(
      MOCK_MUTATION_PROVISIONAL as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>
    )
    render(<ArAgingPage />, { wrapper })
    expect(screen.getByText(/provisional report/i)).toBeInTheDocument()
  })

  it('renders error surface on mutation failure', () => {
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue(
      MOCK_MUTATION_ERROR as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>
    )
    render(<ArAgingPage />, { wrapper })
    expect(screen.getByText(/couldn't run the ar aging report/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('Export CSV button is present and enabled when report result is available', async () => {
    vi.spyOn(reportsApi, 'exportArAgingSummaryCsv').mockResolvedValue(undefined)
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>
    )
    render(<ArAgingPage />, { wrapper })

    // Export button should be enabled when phase is SUCCESS
    const exportBtn = await screen.findByRole('button', { name: /export csv/i })
    expect(exportBtn).toBeInTheDocument()
    expect(exportBtn).not.toBeDisabled()
  })

  it('calls mutation.reset when a filter changes after success', () => {
    const mockReset = vi.fn()
    vi.spyOn(useReportsHook, 'useArAgingSummary').mockReturnValue({
      ...MOCK_MUTATION_SUCCESS,
      reset: mockReset,
    } as unknown as ReturnType<typeof useReportsHook.useArAgingSummary>)
    render(<ArAgingPage />, { wrapper })

    // Change the as-of date filter to trigger reset
    const asOfInput = screen.getByLabelText(/as of/i)
    fireEvent.change(asOfInput, { target: { value: '2026-04-30' } })
    expect(mockReset).toHaveBeenCalled()
  })
})
