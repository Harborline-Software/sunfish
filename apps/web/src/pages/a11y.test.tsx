/**
 * Baseline a11y tests for cohort-2 pages.
 * Uses jest-axe to run axe-core rules against rendered component trees.
 *
 * NOTE: These tests run against the pre-cohort-2-merge state of each page.
 * When sunfish#18 (AccountingPage) and sunfish#19 (RentCollectionPage) merge,
 * update the hook mocks below to match the new hook signatures
 * (useAccountingSummary / useAccountingOutstanding for AccountingPage).
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AccountingPage } from './AccountingPage'
import { RentCollectionPage } from './RentCollectionPage'
import { LeaseDetailPage } from './LeaseDetailPage'
import * as useLeaseHook from '@/hooks/useLeases'
import type { LeaseSummary } from '@/api/leases'

beforeAll(() => {
  expect.extend(toHaveNoViolations)
})

function makeWrapper(path: string, routePattern: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePattern} element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

const MOCK_LEASE: LeaseSummary = {
  leaseId: 'lease-a11y-001',
  tenantDisplayName: 'Jane Smith',
  propertyId: 'prop-001',
  propertyDisplayName: '150 Lexington Ct',
  unitId: 'unit-1',
  startDate: '2025-01-01',
  endDate: '2099-12-31',
  monthlyRent: 1500,
  status: 'Active',
}

describe('AccountingPage — a11y', () => {
  it('has no axe violations in loading state', async () => {
    const { container } = render(<AccountingPage />, {
      wrapper: makeWrapper('/accounting', '/accounting'),
    })
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('RentCollectionPage — a11y', () => {
  it('has no axe violations in initial state (loading leases)', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useLeaseHook.useLeases>)

    const { container } = render(<RentCollectionPage />, {
      wrapper: makeWrapper('/rent', '/rent'),
    })
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations with leases loaded', async () => {
    vi.spyOn(useLeaseHook, 'useLeases').mockReturnValue({
      data: [MOCK_LEASE],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useLeaseHook.useLeases>)

    const { container } = render(<RentCollectionPage />, {
      wrapper: makeWrapper('/rent', '/rent'),
    })
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('LeaseDetailPage — a11y', () => {
  it('has no axe violations in loading state', async () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useLeaseHook.useLease>)

    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useLeaseHook.usePayments>)

    const { container } = render(<LeaseDetailPage />, {
      wrapper: makeWrapper('/leases/lease-a11y-001', '/leases/:name'),
    })
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations in error state', async () => {
    vi.spyOn(useLeaseHook, 'useLease').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Not found'),
      refetch: vi.fn(),
    } as ReturnType<typeof useLeaseHook.useLease>)

    vi.spyOn(useLeaseHook, 'usePayments').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useLeaseHook.usePayments>)

    const { container } = render(<LeaseDetailPage />, {
      wrapper: makeWrapper('/leases/lease-a11y-001', '/leases/:name'),
    })
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
