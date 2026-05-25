/**
 * RentRollPage unit tests — cohort-3 PR 2
 *
 * Coverage shape (per dispatch):
 *  - happy path: IDLE → RUN → SUCCESS renders table + portfolio summary
 *  - filter change after result resets to IDLE state
 *  - provisional banner renders when isProvisional=true
 *  - CSV export button click calls exportRentRollCsv
 *  - error surface renders on mutation failure
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RentRollPage } from './RentRollPage'
import * as useReportsHook from '@/hooks/useReports'
import * as reportsApi from '@/api/reports'
import type {
  RentRollResult,
  RentRollPropertyBlock,
  RentRollPortfolioSummary,
} from '@/api/reports'

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const MOCK_PORTFOLIO: RentRollPortfolioSummary = {
  propertiesCovered: 1,
  totalUnits: 2,
  occupiedUnits: 1,
  occupancyRate: 0.5,
  monthlyRentTotal: 2400,
  openBalanceTotal: 0,
}

const MOCK_PROPERTY_BLOCK: RentRollPropertyBlock = {
  propertyKey: 'PROP-001',
  propertyName: 'Harborview Apartments',
  units: [
    {
      unitLabel: '101',
      currentLeaseId: 'LEASE-001',
      tenantId: 'TENANT-001',
      tenantName: 'Alice Johnson',
      leaseStart: '2025-01-01',
      leaseEnd: '2099-12-31',
      expiringSoon: false,
      monthlyRent: 1200,
      projectedNextMonthRent: 1200,
      lastPaymentDate: '2026-05-01',
      prepaidBalance: 0,
      openBalance: 0,
      delinquencyBucket: 'Current',
      status: 'Occupied',
      vacancyReason: null,
    },
    {
      unitLabel: '102',
      currentLeaseId: null,
      tenantId: null,
      tenantName: null,
      leaseStart: null,
      leaseEnd: null,
      expiringSoon: false,
      monthlyRent: 1200,
      projectedNextMonthRent: 1200,
      lastPaymentDate: null,
      prepaidBalance: 0,
      openBalance: 0,
      delinquencyBucket: 'NoBalance',
      status: 'Vacant',
      vacancyReason: 'Turnover',
    },
  ],
  summary: {
    totalUnits: 2,
    occupiedUnits: 1,
    occupancyRate: 0.5,
    monthlyRentTotal: 2400,
    monthlyRentTotalIfFullyLeased: 2400,
    openBalanceTotal: 0,
  },
}

const MOCK_RESULT: RentRollResult = {
  asOf: '2026-05-25',
  properties: [MOCK_PROPERTY_BLOCK],
  portfolio: MOCK_PORTFOLIO,
}

const MOCK_MUTATION_IDLE = {
  isPending: false,
  isError: false,
  isSuccess: false,
  isIdle: true,
  mutate: vi.fn(),
  reset: vi.fn(),
  data: undefined,
  error: null,
  variables: undefined,
}

const MOCK_MUTATION_PENDING = {
  ...MOCK_MUTATION_IDLE,
  isPending: true,
  isIdle: false,
}

const MOCK_MUTATION_SUCCESS = {
  ...MOCK_MUTATION_IDLE,
  isSuccess: true,
  isIdle: false,
  data: {
    kind: 'rent-roll',
    result: MOCK_RESULT,
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
    warnings: ['Ledger entries pending journal approval'],
  },
}

const MOCK_MUTATION_ERROR = {
  ...MOCK_MUTATION_IDLE,
  isError: true,
  isIdle: false,
  error: new Error('Network error'),
}

// Stub out useCharts so ChartSelector doesn't try to fetch
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

describe('RentRollPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useReportsHook, 'useCharts').mockReturnValue(
      MOCK_CHARTS_ONE as unknown as ReturnType<typeof useReportsHook.useCharts>
    )
  })

  it('renders page heading and Run report button in IDLE state', () => {
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue(
      MOCK_MUTATION_IDLE as unknown as ReturnType<typeof useReportsHook.useRentRoll>
    )
    render(<RentRollPage />, { wrapper })
    expect(screen.getByRole('heading', { name: /rent roll/i })).toBeInTheDocument()
    // Run report button — enabled because chart auto-selected from single chart
    expect(screen.getByRole('button', { name: /run report/i })).toBeInTheDocument()
  })

  it('shows skeleton loader while report is running', () => {
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue(
      MOCK_MUTATION_PENDING as unknown as ReturnType<typeof useReportsHook.useRentRoll>
    )
    render(<RentRollPage />, { wrapper })
    // Skeleton rows — aria-busy or animate-pulse elements indicate loading
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('renders portfolio summary and property table on success', async () => {
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useRentRoll>
    )
    render(<RentRollPage />, { wrapper })

    // Portfolio summary tiles
    expect(screen.getByText('50%')).toBeInTheDocument()  // occupancy rate

    // Property block
    expect(await screen.findByText('Harborview Apartments')).toBeInTheDocument()

    // Unit rows from the table
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('102')).toBeInTheDocument()
    expect(screen.getByText('(vacant)')).toBeInTheDocument()
  })

  it('renders provisionality banner when result is provisional', () => {
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue(
      MOCK_MUTATION_PROVISIONAL as unknown as ReturnType<typeof useReportsHook.useRentRoll>
    )
    render(<RentRollPage />, { wrapper })
    expect(screen.getByText(/provisional report/i)).toBeInTheDocument()
  })

  it('renders error surface on mutation failure', () => {
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue(
      MOCK_MUTATION_ERROR as unknown as ReturnType<typeof useReportsHook.useRentRoll>
    )
    render(<RentRollPage />, { wrapper })
    expect(screen.getByText(/couldn't load the rent roll/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls exportRentRollCsv when Export CSV is clicked after a run', async () => {
    const mockExport = vi.spyOn(reportsApi, 'exportRentRollCsv').mockResolvedValue(undefined)
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue(
      MOCK_MUTATION_SUCCESS as unknown as ReturnType<typeof useReportsHook.useRentRoll>
    )
    render(<RentRollPage />, { wrapper })

    // Click Run report first so submittedParams is set (required for export guard)
    const runBtn = screen.getByRole('button', { name: /run report/i })
    fireEvent.click(runBtn)

    const exportBtn = screen.getByRole('button', { name: /export csv/i })
    fireEvent.click(exportBtn)
    await waitFor(() => expect(mockExport).toHaveBeenCalledOnce())
  })

  it('resets result when a filter changes after success', () => {
    const mockMutate = vi.fn()
    const mockReset = vi.fn()
    vi.spyOn(useReportsHook, 'useRentRoll').mockReturnValue({
      ...MOCK_MUTATION_SUCCESS,
      mutate: mockMutate,
      reset: mockReset,
    } as unknown as ReturnType<typeof useReportsHook.useRentRoll>)
    render(<RentRollPage />, { wrapper })

    // Changing the "as of" date filter should call reset
    const asOfInput = screen.getByLabelText(/as of/i)
    fireEvent.change(asOfInput, { target: { value: '2026-04-30' } })
    expect(mockReset).toHaveBeenCalled()
  })
})
