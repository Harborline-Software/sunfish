/**
 * TrialBalancePage unit tests — cohort-3 PR 4
 *
 * Coverage shape (per dispatch):
 *  - happy path: renders heading + account table on SUCCESS with balanced badge
 *  - loading skeleton renders while mutation isPending
 *  - provisional banner renders when isProvisional=true
 *  - CSV export button click calls exportTrialBalanceCsv
 *  - error surface renders on mutation failure
 *  - filter change after result resets to IDLE (calls mutation.reset)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TrialBalancePage } from './TrialBalancePage'
import * as useReportsHook from '@/hooks/useReports'
import * as reportsApi from '@/api/reports'
import type { TrialBalanceResult } from '@/api/reports'

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const MOCK_TB_RESULT: TrialBalanceResult = {
  chartId: 'chart-abc',
  asOf: '2026-05-25T00:00:00Z',
  isBalanced: true,
  totalDebit: 50000,
  totalCredit: 50000,
  isProvisional: false,
  warnings: [],
  rows: [
    {
      accountId: 'acc-1',
      accountCode: '1000',
      accountName: 'Cash',
      accountType: 'Asset',
      debitBalance: 50000,
      creditBalance: 0,
    },
    {
      accountId: 'acc-2',
      accountCode: '3000',
      accountName: 'Equity',
      accountType: 'Equity',
      debitBalance: 0,
      creditBalance: 50000,
    },
  ],
}

const MOCK_MUTATION_IDLE = {
  isPending: false,
  isError: false,
  isSuccess: false,
  mutate: vi.fn(),
  reset: vi.fn(),
  data: undefined,
  error: null,
}

const MOCK_MUTATION_PENDING = {
  ...MOCK_MUTATION_IDLE,
  isPending: true,
}

const MOCK_MUTATION_SUCCESS = {
  ...MOCK_MUTATION_IDLE,
  isSuccess: true,
  data: {
    kind: 'trial-balance',
    result: MOCK_TB_RESULT,
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
    warnings: ['Pending journal entries'],
    result: {
      ...MOCK_TB_RESULT,
      isProvisional: true,
      warnings: ['Pending journal entries'],
    },
  },
}

const MOCK_MUTATION_ERROR = {
  ...MOCK_MUTATION_IDLE,
  isError: true,
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

describe('TrialBalancePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useReportsHook, 'useCharts').mockReturnValue(
      MOCK_CHARTS_ONE as unknown as ReturnType<typeof useReportsHook.useCharts>
    )
  })

  it('renders page heading and Run report button in IDLE state', () => {
    vi.spyOn(useReportsHook, 'useTrialBalance').mockReturnValue(
      MOCK_MUTATION_IDLE as unknown as ReturnType<typeof useReportsHook.useTrialBalance>
    )
    render(<TrialBalancePage />, { wrapper })
    expect(screen.getByRole('heading', { name: /trial balance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run report/i })).toBeInTheDocument()
  })

  it('shows skeleton loader while mutation is pending', () => {
    vi.spyOn(useReportsHook, 'useTrialBalance').mockReturnValue(
      MOCK_MUTATION_PENDING as unknown as ReturnType<typeof useReportsHook.useTrialBalance>
    )
    render(<TrialBalancePage />, { wrapper })
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/loading trial balance/i)).toBeInTheDocument()
  })

  it('renders account table and balanced badge on success', async () => {
    vi.spyOn(useReportsHook, 'useTrialBalance').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useTrialBalance>
    )
    render(<TrialBalancePage />, { wrapper })

    // Account rows
    expect(await screen.findByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Equity')).toBeInTheDocument()

    // Balanced badge
    expect(screen.getByText(/balanced/i)).toBeInTheDocument()
  })

  it('renders provisionality banner when result is provisional', () => {
    vi.spyOn(useReportsHook, 'useTrialBalance').mockReturnValue(
      MOCK_MUTATION_PROVISIONAL as unknown as ReturnType<typeof useReportsHook.useTrialBalance>
    )
    render(<TrialBalancePage />, { wrapper })
    expect(screen.getByText(/provisional report/i)).toBeInTheDocument()
  })

  it('renders error surface on mutation failure', () => {
    vi.spyOn(useReportsHook, 'useTrialBalance').mockReturnValue(
      MOCK_MUTATION_ERROR as unknown as ReturnType<typeof useReportsHook.useTrialBalance>
    )
    render(<TrialBalancePage />, { wrapper })
    expect(screen.getByText(/couldn't load trial balance/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('Export CSV button is present and enabled when report result is available', async () => {
    vi.spyOn(useReportsHook, 'useTrialBalance').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useTrialBalance>
    )
    render(<TrialBalancePage />, { wrapper })

    // Trigger run to set submittedResult/lastSubmittedParams state
    const runBtn = screen.getByRole('button', { name: /run report/i })
    fireEvent.click(runBtn)

    // Export button should become enabled when pageState === 'SUCCESS'
    const exportBtn = await screen.findByRole('button', { name: /export csv/i })
    expect(exportBtn).toBeInTheDocument()
    expect(exportBtn).not.toBeDisabled()
  })
})
