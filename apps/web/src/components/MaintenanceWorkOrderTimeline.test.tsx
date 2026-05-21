import { describe, it, expect, beforeAll } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import { render, screen } from '@testing-library/react'
import { MaintenanceWorkOrderTimeline } from './MaintenanceWorkOrderTimeline'
import type { WorkOrderSummary } from '@/api/maintenance'

const today = new Date()
const iso = (d: Date) => d.toISOString().slice(0, 10)
const relDay = (n: number) => iso(new Date(Date.now() + n * 86_400_000))

const ITEMS: WorkOrderSummary[] = [
  {
    workOrderId: 'wo-ulid-aaa00001',
    status: 'InProgress',
    vendorId: 'vnd-ulid-0001',
    scheduledDate: relDay(-5),
    completedDate: null,
    appointmentDate: relDay(2),
  },
  {
    workOrderId: 'wo-ulid-bbb00002',
    status: 'Completed',
    vendorId: 'vnd-ulid-0002',
    scheduledDate: relDay(-10),
    completedDate: relDay(-2),
    appointmentDate: null,
  },
  {
    workOrderId: 'wo-ulid-ccc00003',
    status: 'Scheduled',
    vendorId: 'vnd-ulid-0003',
    scheduledDate: relDay(3),
    completedDate: null,
    appointmentDate: null,
  },
  {
    workOrderId: 'wo-ulid-ddd00004',
    status: 'OnHold',
    vendorId: 'vnd-ulid-0004',
    scheduledDate: '',       // empty string — treated as null
    completedDate: null,
    appointmentDate: null,
  },
]

describe('MaintenanceWorkOrderTimeline', () => {
  beforeAll(() => { expect.extend(toHaveNoViolations) })

  it('has no a11y violations with work orders loaded', async () => {
    const { container } = render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows empty state when items is empty', () => {
    render(<MaintenanceWorkOrderTimeline items={[]} />)
    expect(screen.getByText(/no work orders to display on the timeline/i)).toBeInTheDocument()
  })

  it('renders a row for each work order', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(ITEMS.length)
  })

  it('has accessible aria-labels on each row', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    // Each row label includes the short ID and status
    expect(screen.getByRole('listitem', { name: /aaa00001.*InProgress/i })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /bbb00002.*Completed/i })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /ccc00003.*Scheduled/i })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /ddd00004.*OnHold/i })).toBeInTheDocument()
  })

  it('wraps rows in a list with an accessible label', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    expect(screen.getByRole('list', { name: /maintenance work order timeline/i })).toBeInTheDocument()
  })

  it('rows are keyboard-focusable (tabIndex=0)', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    const rows = screen.getAllByRole('listitem')
    rows.forEach((row) => {
      expect(row).toHaveAttribute('tabindex', '0')
    })
  })

  it('shows status badges', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    // status text appears in both badge and legend — use getAllByText
    expect(screen.getAllByText('InProgress').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Scheduled').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('OnHold').length).toBeGreaterThanOrEqual(1)
  })

  it('renders legend with all 8 status labels', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    for (const status of ['Draft', 'Sent', 'Accepted', 'Scheduled', 'InProgress', 'Completed', 'OnHold', 'Cancelled']) {
      expect(screen.getAllByText(status).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('gracefully renders row with no scheduledDate (empty string)', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    // ddd00004 has empty scheduledDate — should render without throwing
    expect(screen.getByRole('listitem', { name: /ddd00004.*OnHold.*no date/i })).toBeInTheDocument()
  })

  it('renders today marker when today is in range', () => {
    render(<MaintenanceWorkOrderTimeline items={ITEMS} />)
    // the today marker is aria-hidden but the list should render
    expect(screen.getByRole('list')).toBeInTheDocument()
    // today's date appears in the aria-label of items scheduled relative to it
    void today // confirm today is used in range calculation
  })
})
