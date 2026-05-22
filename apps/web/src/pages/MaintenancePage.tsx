import { useState } from 'react'
import { useWorkOrders, useCreateWorkOrder } from '@/hooks/useMaintenance'
import type { WorkOrderSummary } from '@/api/maintenance'  // rebound from @/api/erpnext — W#74 PR 3
import { AuthRoleGate } from '@/components/AuthRoleGate'
import { MaintenanceWorkOrderTimeline } from '@/components/MaintenanceWorkOrderTimeline'
import { ErrorCard } from '@/components/ErrorCard'
import { LoadingState } from '@/components/LoadingState'

const STATUS_COLORS: Record<string, string> = {
  Draft:      'bg-blue-100 text-blue-700',
  Sent:       'bg-purple-100 text-purple-700',
  Accepted:   'bg-indigo-100 text-indigo-700',
  Scheduled:  'bg-yellow-100 text-yellow-700',
  InProgress: 'bg-orange-100 text-orange-700',
  Completed:  'bg-green-100 text-green-700',
  OnHold:     'bg-gray-100 text-gray-700',
  Cancelled:  'bg-red-100 text-red-700',
}

function WorkOrderRow({ wo }: { wo: WorkOrderSummary }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 text-sm font-mono text-gray-500">{wo.workOrderId.slice(-8)}</td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[wo.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {wo.status}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{wo.scheduledDate}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{wo.completedDate ?? '—'}</td>
      <td className="py-3 px-4 text-sm text-gray-500 font-mono">{wo.vendorId.slice(-8)}</td>
    </tr>
  )
}

function CreateWorkOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const [subject,       setSubject]       = useState('')
  const [vendorId,      setVendorId]      = useState('')
  const [priority,      setPriority]      = useState('Normal')
  const [scheduledDate, setScheduledDate] = useState('')

  const mutation = useCreateWorkOrder()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(
      {
        subject,
        vendorId,
        priority,
        scheduledDate: scheduledDate || null,
      },
      {
        onSuccess: () => {
          setSubject('')
          setVendorId('')
          setPriority('Normal')
          setScheduledDate('')
          onSuccess()
        },
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-gray-700">New Work Order</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          placeholder="Subject / description"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="col-span-2 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          required
          placeholder="Vendor ID"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Emergency">Emergency</option>
        </select>
        <input
          type="date"
          placeholder="Scheduled date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Submitting…' : 'Create Work Order'}
      </button>
      {mutation.isError && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

type View = 'table' | 'timeline'

export function MaintenancePage() {
  const { data, isPending, isError, error, refetch } = useWorkOrders()
  const [view, setView] = useState<View>('table')

  const workOrders = data?.items ?? []
  const openCount  = workOrders.filter(
    (wo) => wo.status !== 'Completed' && wo.status !== 'Cancelled',
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500">
            {openCount} open work order{openCount !== 1 ? 's' : ''}
          </p>
        </div>
        {workOrders.length > 0 && (
          <div
            role="group"
            aria-label="View mode"
            className="flex rounded-md border border-gray-200 overflow-hidden text-sm"
          >
            <button
              type="button"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              className={`px-3 py-1.5 ${view === 'table' ? 'bg-gray-100 font-medium text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setView('timeline')}
              aria-pressed={view === 'timeline'}
              className={`px-3 py-1.5 border-l border-gray-200 ${view === 'timeline' ? 'bg-gray-100 font-medium text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Timeline
            </button>
          </div>
        )}
      </div>

      <AuthRoleGate allow={['owner', 'manager']}>
        <CreateWorkOrderForm onSuccess={() => void refetch()} />
      </AuthRoleGate>

      {isPending && <LoadingState label="Loading work orders…" variant="inline" />}
      {isError && (
        <ErrorCard
          variant="compact"
          title="Failed to load work orders"
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      )}

      {!isPending && !isError && workOrders.length === 0 && (
        <p className="text-sm text-gray-500">
          No work orders found. Add a work order in the cockpit to get started.
        </p>
      )}

      {workOrders.length > 0 && view === 'table' && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Scheduled</th>
                <th className="py-3 px-4">Completed</th>
                <th className="py-3 px-4">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <WorkOrderRow key={wo.workOrderId} wo={wo} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {workOrders.length > 0 && view === 'timeline' && (
        <MaintenanceWorkOrderTimeline items={workOrders} />
      )}
    </div>
  )
}
