import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MaintenancePage } from './MaintenancePage'
import * as useMaintenanceHook from '@/hooks/useMaintenance'
import type { WorkOrderList } from '@/api/maintenance'  // rebound from @/api/erpnext — W#74 PR 3

// AuthRoleGate pulls in @sunfish/ui-react (dist not built in test env); pass-through stub.
vi.mock('@/components/AuthRoleGate', () => ({
  AuthRoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/maintenance']}>
        <Routes>
          <Route path="/maintenance" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const MOCK_LIST: WorkOrderList = {
  items: [
    {
      workOrderId: 'wo-ulid-0001',
      status: 'InProgress',
      vendorId: 'vendor-001',
      scheduledDate: '2099-06-01',
      completedDate: null,
      appointmentDate: null,
    },
    {
      workOrderId: 'wo-ulid-0002',
      status: 'Completed',
      vendorId: 'vendor-002',
      scheduledDate: '2099-05-15',
      completedDate: '2099-05-20',
      appointmentDate: null,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

const PENDING_QUERY = {
  data: undefined,
  isPending: true,
  isError: false,
  error: null,
  refetch: vi.fn(),
} as unknown as ReturnType<typeof useMaintenanceHook.useWorkOrders>

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useMaintenanceHook, 'useCreateWorkOrder').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMaintenanceHook.useCreateWorkOrder>)
  })

  it('shows loading state while pending', () => {
    vi.spyOn(useMaintenanceHook, 'useWorkOrders').mockReturnValue(PENDING_QUERY)
    render(<MaintenancePage />, { wrapper })
    expect(screen.getByText(/loading work orders/i)).toBeInTheDocument()
  })

  it('renders work order rows with cockpit DTO field names', () => {
    vi.spyOn(useMaintenanceHook, 'useWorkOrders').mockReturnValue({
      data: MOCK_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMaintenanceHook.useWorkOrders>)

    render(<MaintenancePage />, { wrapper })
    // Status badge values (at least one match each; "Completed" also appears as column header)
    expect(screen.getByText('InProgress')).toBeInTheDocument()
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
    // Scheduled date
    expect(screen.getByText('2099-06-01')).toBeInTheDocument()
    // Open count (InProgress = open, Completed = closed)
    expect(screen.getByText(/1 open work order/i)).toBeInTheDocument()
  })

  it('shows error state with retry', () => {
    vi.spyOn(useMaintenanceHook, 'useWorkOrders').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Bridge unreachable'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMaintenanceHook.useWorkOrders>)

    render(<MaintenancePage />, { wrapper })
    expect(screen.getByText(/bridge unreachable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders accessible form labels', () => {
    vi.spyOn(useMaintenanceHook, 'useWorkOrders').mockReturnValue({
      data: MOCK_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMaintenanceHook.useWorkOrders>)

    render(<MaintenancePage />, { wrapper })
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vendor id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/scheduled date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('submit button carries aria-busy when mutation is pending', () => {
    vi.spyOn(useMaintenanceHook, 'useWorkOrders').mockReturnValue({
      data: MOCK_LIST,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMaintenanceHook.useWorkOrders>)
    vi.spyOn(useMaintenanceHook, 'useCreateWorkOrder').mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMaintenanceHook.useCreateWorkOrder>)

    render(<MaintenancePage />, { wrapper })
    const submitBtn = screen.getByRole('button', { name: /submitting/i })
    expect(submitBtn).toHaveAttribute('aria-busy', 'true')
    expect(submitBtn).toBeDisabled()
  })

  it('shows updated empty-state copy (no ERPNext reference)', () => {
    vi.spyOn(useMaintenanceHook, 'useWorkOrders').mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMaintenanceHook.useWorkOrders>)

    render(<MaintenancePage />, { wrapper })
    expect(screen.getByText(/no work orders found/i)).toBeInTheDocument()
    expect(screen.getByText(/add a work order in the cockpit/i)).toBeInTheDocument()
    expect(screen.queryByText(/ERPNext/i)).not.toBeInTheDocument()
  })
})
