import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuditEventsPage } from './AuditEventsPage'
import * as auditEventsApi from '@/api/audit-events'
import { TenantChangedError, InvalidSeverityError } from '@/api/audit-events'
import type { AuditEventSummary } from '@/api/audit-events'

// ErrorCard + LoadingState are now shared @sunfish/ui-react components; stub
// only those two, preserving the rest of the package.
vi.mock('@sunfish/ui-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sunfish/ui-react')>()
  return {
    ...actual,
    ErrorCard: ({ title, message }: { title: string; message?: string }) => (
      <div role="alert" data-testid="error-card">
        {title}
        {message && <span>{message}</span>}
      </div>
    ),
    LoadingState: ({ label }: { label: string }) => <div data-testid="loading-state">{label}</div>,
  }
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/audit-trail']}>
        <Routes>
          <Route path="/audit-trail" element={children} />
          <Route path="/audit-trail/:auditId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Fixtures include tenant_id (cohort-4 cycle 2 — AuditEventDto 7-field shape).
const MOCK_FINANCIAL_EVENT: AuditEventSummary = {
  audit_id: '01HZ4KW2P3RQNVT8X6J0M5ABCD',
  occurred_at: '2026-05-21T17:15:44Z',
  event_type: 'Financial.InvoicePosted',
  actor: 'admin@sunfish.local',
  correlation_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  tenant_id: 'tenant-foobar-id',
  payload_summary: { invoice_name: 'INV-2026-05-21-0001-0001', amount: 2400 },
  signature_state: 'Verified',
}

const MOCK_SECURITY_EVENT: AuditEventSummary = {
  audit_id: '01HZ4KW2P3RQNVT8X6J0M5LMNO',
  occurred_at: '2026-05-21T14:48:30Z',
  event_type: 'Security.TenantBoundaryViolation',
  actor: null,
  correlation_id: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
  tenant_id: 'tenant-foobar-id',
  payload_summary: { entity_type: 'Lease', requested_tenant: 'acme', actual_tenant: 'beta' },
  signature_state: 'VerificationFailed',
}

function mockHookSuccess(
  events: AuditEventSummary[],
  nextCursor: string | null = null
) {
  vi.spyOn(auditEventsApi, 'useAuditEvents').mockReturnValue({
    data: {
      pages: [{ events, next_cursor: nextCursor, has_more: nextCursor !== null }],
      pageParams: [undefined],
    },
    error: null,
    isPending: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: nextCursor !== null,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof auditEventsApi.useAuditEvents>)
}

describe('AuditEventsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockReset()
  })

  // Test 1
  it('renders loading state while pending', () => {
    vi.spyOn(auditEventsApi, 'useAuditEvents').mockReturnValue({
      data: undefined,
      error: null,
      isPending: true,
      isFetching: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof auditEventsApi.useAuditEvents>)

    render(<AuditEventsPage />, { wrapper })
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByText('Loading audit events...')).toBeInTheDocument()
  })

  // Test 2
  it('renders empty state when no events returned', () => {
    mockHookSuccess([])
    render(<AuditEventsPage />, { wrapper })
    expect(screen.getByText('No audit events match the current filters.')).toBeInTheDocument()
  })

  // Test 3
  it('renders event rows from useAuditEvents data', () => {
    mockHookSuccess([MOCK_FINANCIAL_EVENT, MOCK_SECURITY_EVENT])
    render(<AuditEventsPage />, { wrapper })
    expect(screen.getAllByText('Financial.InvoicePosted').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Security.TenantBoundaryViolation').length).toBeGreaterThan(0)
  })

  // Test 4 — A2
  it('Security.TenantBoundaryViolation row renders with red-tinted styling and SECURITY badge', () => {
    mockHookSuccess([MOCK_SECURITY_EVENT])
    render(<AuditEventsPage />, { wrapper })
    const row = screen.getByRole('button', { name: /Audit event.*Security\.TenantBoundaryViolation/ })
    expect(row.className).toMatch(/bg-red-50/)
    expect(screen.getByText('SECURITY')).toBeInTheDocument()
  })

  // Test 5 — A2
  it('Financial.InvoicePosted row renders with default styling, no SECURITY badge', () => {
    mockHookSuccess([MOCK_FINANCIAL_EVENT])
    render(<AuditEventsPage />, { wrapper })
    const row = screen.getByRole('button', { name: /Audit event.*Financial\.InvoicePosted/ })
    expect(row.className).not.toMatch(/bg-red-50/)
    expect(screen.queryByText('SECURITY')).not.toBeInTheDocument()
  })

  // Test 6 — A2
  it('severity filter dropdown is present with Security/Financial/Messaging/Authentication options', () => {
    mockHookSuccess([MOCK_FINANCIAL_EVENT])
    render(<AuditEventsPage />, { wrapper })
    const severitySelect = screen.getByLabelText('Severity')
    expect(severitySelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Security only' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Financial only' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Messaging only' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Authentication only' })).toBeInTheDocument()
  })

  // Test 6b — A2: severity filter is now a server query param (cohort-4 cycle 2).
  // Verify the hook is called with severity in the filters object when the dropdown changes.
  it('severity filter sends severity param to hook: Security filter passes severity to useAuditEvents', () => {
    const hookSpy = vi.spyOn(auditEventsApi, 'useAuditEvents').mockImplementation((filters) => {
      const events = filters.severity === 'Security'
        ? [MOCK_SECURITY_EVENT]
        : [MOCK_FINANCIAL_EVENT, MOCK_SECURITY_EVENT]
      return {
        data: {
          pages: [{ events, next_cursor: null, has_more: false }],
          pageParams: [undefined],
        },
        error: null,
        isPending: false,
        isFetching: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof auditEventsApi.useAuditEvents>
    })

    render(<AuditEventsPage />, { wrapper })

    // Initial render: hook called without severity (filters is {}, no severity key)
    expect(hookSpy).toHaveBeenLastCalledWith(expect.not.objectContaining({ severity: expect.anything() }))

    // Select Security severity filter
    const severitySelect = screen.getByLabelText('Severity')
    fireEvent.change(severitySelect, { target: { value: 'Security' } })

    // After filter change: hook is called with severity: 'Security' (server query param)
    expect(hookSpy).toHaveBeenLastCalledWith(expect.objectContaining({ severity: 'Security' }))
    // Server-filtered response shows only Security event
    expect(screen.queryByText('Financial.InvoicePosted')).not.toBeInTheDocument()
    expect(screen.getByText('Security.TenantBoundaryViolation')).toBeInTheDocument()
  })

  // Test 6c — A2 cohort-4 cycle 2: 400 invalid_severity renders inline error
  it('AuditEventsPage_InvalidSeverity_RendersInlineError', () => {
    vi.spyOn(auditEventsApi, 'useAuditEvents').mockReturnValue({
      data: undefined,
      error: new InvalidSeverityError('UnknownSeverity'),
      isPending: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof auditEventsApi.useAuditEvents>)

    render(<AuditEventsPage />, { wrapper })

    // Inline error card appears; NOT the tenant-reload banner
    expect(screen.getByTestId('error-card')).toBeInTheDocument()
    expect(screen.getByText('Invalid severity filter')).toBeInTheDocument()
    expect(screen.queryByText('Session changed. Reloading...')).not.toBeInTheDocument()
  })

  // Test 7
  it('clicking event row navigates to /audit-trail/:auditId', () => {
    mockHookSuccess([MOCK_FINANCIAL_EVENT])
    render(<AuditEventsPage />, { wrapper })
    const row = screen.getByRole('button', { name: /Audit event.*Financial\.InvoicePosted/ })
    fireEvent.click(row)
    expect(mockNavigate).toHaveBeenCalledWith(`/audit-trail/${MOCK_FINANCIAL_EVENT.audit_id}`)
  })

  // Test 8 — Nit 2
  it('Load more button is hidden when next_cursor is null', () => {
    mockHookSuccess([MOCK_FINANCIAL_EVENT], null)
    render(<AuditEventsPage />, { wrapper })
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('Load more button is visible when next_cursor is non-null', () => {
    mockHookSuccess([MOCK_FINANCIAL_EVENT], 'cursor-abc')
    render(<AuditEventsPage />, { wrapper })
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  // Test 9 — G1
  it('400 tenant_changed_reload_page error shows reload message', () => {
    vi.spyOn(auditEventsApi, 'useAuditEvents').mockReturnValue({
      data: undefined,
      error: new TenantChangedError(),
      isPending: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof auditEventsApi.useAuditEvents>)

    render(<AuditEventsPage />, { wrapper })
    expect(screen.getByText('Session changed. Reloading...')).toBeInTheDocument()
  })

  // Test 10 — G1: cursor must not appear in console.log output
  it('cursor values are not logged to console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mockHookSuccess([MOCK_FINANCIAL_EVENT], 'opaque-cursor-value-xyz')
    render(<AuditEventsPage />, { wrapper })
    const allLogArgs = consoleSpy.mock.calls.flat().join(' ')
    expect(allLogArgs).not.toContain('opaque-cursor-value-xyz')
    consoleSpy.mockRestore()
  })

  // Test 11 — Nit 4: htmlFor on filter labels matches input id
  it('filter labels have htmlFor wired to matching input ids', () => {
    mockHookSuccess([])
    render(<AuditEventsPage />, { wrapper })
    // Accessing by label text confirms htmlFor/id association
    expect(screen.getByLabelText('From')).toHaveAttribute('id', 'audit-filter-from')
    expect(screen.getByLabelText('To')).toHaveAttribute('id', 'audit-filter-to')
    expect(screen.getByLabelText('Event type')).toHaveAttribute('id', 'audit-filter-event-type')
    expect(screen.getByLabelText('Severity')).toHaveAttribute('id', 'audit-filter-severity')
    expect(screen.getByLabelText('Correlation ID')).toHaveAttribute('id', 'audit-filter-correlation')
  })

  // Test 12 — Nit 5: no decorative no-op Filter button
  it('no no-op Filter button is present in the DOM', () => {
    mockHookSuccess([])
    render(<AuditEventsPage />, { wrapper })
    const filterButtons = screen.queryAllByRole('button', { name: /^filter$/i })
    expect(filterButtons).toHaveLength(0)
  })
})
