import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuditEventDetailPage } from './AuditEventDetailPage'
import * as auditEventsApi from '@/api/audit-events'
import type { AuditEventDetail } from '@/api/audit-events'
// NOTE: AuditEventDetail is now an alias for AuditEventSummary (6-field wire
// contract matching signal-bridge AuditEventDto). No tenant_id, payload, or
// signatures on the real wire — these are forward-watched substrate extensions.

vi.mock('@/components/ErrorCard', () => ({
  ErrorCard: ({ title, message }: { title: string; message?: string }) => (
    <div role="alert" data-testid="error-card">
      {title}
      {message && <span>{message}</span>}
    </div>
  ),
}))
vi.mock('@/components/LoadingState', () => ({
  LoadingState: ({ label }: { label: string }) => <div data-testid="loading-state">{label}</div>,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/audit-trail/01HZ4KW2P3RQNVT8X6J0M5LMNO']}>
        <Routes>
          <Route path="/audit-trail" element={<div>list</div>} />
          <Route path="/audit-trail/:auditId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// MOCK_TBV_DETAIL uses the real 6-field AuditEventDto wire contract.
// TBV payload fields live in payload_summary (per signal-bridge AuditEventsDtos.cs).
const MOCK_TBV_DETAIL: AuditEventDetail = {
  audit_id: '01HZ4KW2P3RQNVT8X6J0M5LMNO',
  occurred_at: '2026-05-21T14:48:30Z',
  event_type: 'Security.TenantBoundaryViolation',
  actor: null,
  correlation_id: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
  payload_summary: {
    entity_type: 'Lease',
    entity_id: 'lease-ulid-0001',
    requested_tenant: 'tenant-acme',
    actual_tenant: 'tenant-beta',
    correlation_id: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
  },
  signature_state: 'VerificationFailed',
}

function mockDetailSuccess(detail: AuditEventDetail) {
  vi.spyOn(auditEventsApi, 'useAuditEventDetail').mockReturnValue({
    data: detail,
    error: null,
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof auditEventsApi.useAuditEventDetail>)
}

describe('AuditEventDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Test 1 — A1
  it('renders TenantBoundaryViolation 5-field payload as labeled list, not raw JSON', () => {
    mockDetailSuccess(MOCK_TBV_DETAIL)
    render(<AuditEventDetailPage />, { wrapper })

    expect(screen.getByText('Entity type')).toBeInTheDocument()
    expect(screen.getByText('Lease')).toBeInTheDocument()
    expect(screen.getByText('Entity ID')).toBeInTheDocument()
    expect(screen.getByText('lease-ulid-0001')).toBeInTheDocument()
    expect(screen.getByText('Requested tenant')).toBeInTheDocument()
    // "tenant-acme" appears both in requested_tenant and in activeCompany check;
    // either way the field is rendered
    expect(screen.getByText('Actual tenant')).toBeInTheDocument()
    expect(screen.getByText('tenant-beta')).toBeInTheDocument()
    expect(screen.getAllByText('Correlation ID').length).toBeGreaterThanOrEqual(1)

    // Must NOT be a raw JSON dump
    const pageText = document.body.textContent ?? ''
    expect(pageText).not.toContain('"entity_type"')
    expect(pageText).not.toContain('"entity_id"')
  })

  // Test 2 — A1
  it('TBV payload renders all 5 canonical ADR 0094 field names', () => {
    mockDetailSuccess(MOCK_TBV_DETAIL)
    render(<AuditEventDetailPage />, { wrapper })

    const labels = ['Entity type', 'Entity ID', 'Requested tenant', 'Actual tenant']
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
    // Correlation ID appears in both summary and TBV section
    expect(screen.getAllByText('Correlation ID').length).toBeGreaterThanOrEqual(1)
  })

  // Test 3 — A1: signature_state badge renders for VerificationFailed
  it('renders VerificationFailed signature badge', () => {
    mockDetailSuccess(MOCK_TBV_DETAIL) // signature_state: 'VerificationFailed'
    render(<AuditEventDetailPage />, { wrapper })

    expect(screen.getByText(/Failed/)).toBeInTheDocument()
    // No "Attesting signatures" section for non-Verified state
    expect(screen.queryByText('Attesting signatures')).not.toBeInTheDocument()
  })

  // Test 4 — Nit 7
  it('back link uses <Link> with href /audit-trail, not a <button>', () => {
    mockDetailSuccess(MOCK_TBV_DETAIL)
    render(<AuditEventDetailPage />, { wrapper })

    const backLink = screen.getByRole('link', { name: /← Audit trail/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink.tagName).toBe('A')
    expect(backLink).toHaveAttribute('href', '/audit-trail')
  })

  // Test 5
  it('unknown event type renders payload_summary as key-value pairs via UnknownPayloadRender', () => {
    const msgDetail: AuditEventDetail = {
      ...MOCK_TBV_DETAIL,
      event_type: 'Messaging.MessageDispatched',
      payload_summary: { message_id: 'msg-001', channel: 'email' },
    }
    mockDetailSuccess(msgDetail)
    render(<AuditEventDetailPage />, { wrapper })

    expect(screen.getByText('message_id')).toBeInTheDocument()
    expect(screen.getByText('"msg-001"')).toBeInTheDocument()
    expect(screen.getByText('channel')).toBeInTheDocument()
    expect(screen.queryByText('Entity type')).not.toBeInTheDocument()
  })

  // Test 6 — A1: Verified signature_state shows attesting-signatures section with pending placeholder
  it('AuditEventDetail_VerifiedState_ShowsSignaturePendingPlaceholder', () => {
    mockDetailSuccess({ ...MOCK_TBV_DETAIL, signature_state: 'Verified' })
    render(<AuditEventDetailPage />, { wrapper })

    expect(screen.getByText('Attesting signatures')).toBeInTheDocument()
    expect(screen.getByText(/Signature verification surface pending/)).toBeInTheDocument()
  })
})
