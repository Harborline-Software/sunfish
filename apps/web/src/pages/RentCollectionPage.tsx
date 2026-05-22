import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLeases } from '@/hooks/useLeases'
import { recordPayment, PaymentError } from '@/api/financial'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthRoleGate } from '@/components/AuthRoleGate'
import { enqueuePayment, drainQueue } from '@/lib/offlineQueue'
import type { RecordPaymentResult } from '@/api/financial'

const PAYMENT_METHODS = ['ACH', 'Check', 'Cash', 'Card'] as const

export function RentCollectionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: leases, isPending: leasesPending } = useLeases()
  const leaseSelectRef = useRef<HTMLSelectElement>(null)

  const [selectedLease, setSelectedLease] = useState(searchParams.get('lease') ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<string>('ACH')
  const [confirmation, setConfirmation] = useState<RecordPaymentResult | null>(null)
  const [queuedOffline, setQueuedOffline] = useState(false)

  const mutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['payments', 'lease', selectedLease] })
      setConfirmation(result)
    },
  })

  // Drain offline queue and retry when connectivity returns
  useEffect(() => {
    function onOnline() {
      const queued = drainQueue()
      for (const item of queued) {
        mutation.mutate(item.payload)
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [mutation])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLease || !amount || !date) return
    const payload = {
      leaseId: selectedLease,
      amount: parseFloat(amount),
      currency: 'USD',
      direction: 'Inbound' as const,
      paidAt: new Date(date).toISOString(),
      method,
    }
    if (!navigator.onLine) {
      enqueuePayment(payload)
      setQueuedOffline(true)
      return
    }
    mutation.mutate(payload)
  }

  if (queuedOffline) {
    const lease = leases?.find((l) => l.leaseId === selectedLease)
    return (
      <div className="max-w-md">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-800">Payment queued</h2>
          <p className="mt-1 text-sm text-gray-700">
            <strong>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                parseFloat(amount),
              )}
            </strong>{' '}
            for {lease?.tenantDisplayName ?? selectedLease} will be sent when you're back online.
          </p>
          <div className="mt-4">
            <button
              onClick={() => {
                setQueuedOffline(false)
                setAmount('')
                setSelectedLease('')
              }}
              className="rounded bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
            >
              Queue another
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (confirmation) {
    const lease = leases?.find((l) => l.leaseId === selectedLease)
    return (
      <div className="max-w-md">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6" role="status">
          <h2 className="text-lg font-semibold text-green-800"><span aria-hidden="true">✓</span> Payment recorded</h2>
          <p className="mt-1 text-sm text-gray-700">
            <strong>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                parseFloat(amount),
              )}
            </strong>{' '}
            recorded for {lease?.tenantDisplayName ?? selectedLease}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">(ref: {confirmation.paymentId})</p>
          <hr className="my-3 border-gray-200" />
          <p className="text-sm text-gray-600">
            An audit-trail entry has been emitted. View the lease's payment history to confirm.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setConfirmation(null)
                setAmount('')
                setSelectedLease('')
              }}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Record another
            </button>
            <Link
              to={`/leases/${encodeURIComponent(selectedLease)}`}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              View lease history
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const errorSurface = () => {
    if (!mutation.isError) return null
    const err = mutation.error

    if (err instanceof PaymentError && err.code === 'token-fetch-error') {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-700"><span aria-hidden="true">⚠</span> Couldn't reach the payment service</p>
          <p className="mt-1 text-sm text-gray-600">
            The connection to the payment service failed before we could record your payment.
            Your form is still saved — try again in a moment.
          </p>
          <button
            type="submit"
            className="mt-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Try again
          </button>
        </div>
      )
    }

    if (err instanceof PaymentError && err.code === 'token-rejection') {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-700"><span aria-hidden="true">⚠</span> Session expired</p>
          <p className="mt-1 text-sm text-gray-600">
            Your session expired before this payment could be recorded. Reload the page to start
            fresh.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reload page
          </button>
        </div>
      )
    }

    if (err instanceof PaymentError && err.code === 'lease-not-found') {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-700"><span aria-hidden="true">⚠</span> We couldn't find that lease</p>
          <p className="mt-1 text-sm text-gray-600">
            The lease isn't available for payment recording. Please pick a different lease.
          </p>
          <button
            type="button"
            onClick={() => {
              mutation.reset()
              leaseSelectRef.current?.focus()
            }}
            className="mt-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Choose another lease
          </button>
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
        <p className="font-semibold text-red-700"><span aria-hidden="true">⚠</span> Something went wrong</p>
        <p className="mt-1 text-sm text-gray-600">
          Your payment couldn't be recorded right now. Please try again in a moment. If this keeps
          happening, check with your administrator.
        </p>
        <button
          type="submit"
          className="mt-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Record Rent Payment</h1>
      </div>
      <AuthRoleGate allow={['owner', 'manager']}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="lease">
                  Lease *
                </label>
                <select
                  id="lease"
                  ref={leaseSelectRef}
                  value={selectedLease}
                  onChange={(e) => setSelectedLease(e.target.value)}
                  required
                  aria-required="true"
                  disabled={leasesPending}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select a lease…</option>
                  {leases
                    ?.filter((l) => l.status === 'Active')
                    .map((l) => (
                      <option key={l.leaseId} value={l.leaseId}>
                        {l.tenantDisplayName} — {l.propertyDisplayName ?? l.propertyId}
                        {l.unitId ? ` · ${l.unitId}` : ''} (${l.monthlyRent.toLocaleString()}/mo)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="amount">
                  Amount ($) *
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  aria-required="true"
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {selectedLease && leases && (
                  <p className="mt-1 text-xs text-gray-500">
                    Monthly rent: $
                    {leases
                      .find((l) => l.leaseId === selectedLease)
                      ?.monthlyRent.toLocaleString() ?? '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="date">
                  Payment date *
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  aria-required="true"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="method">
                  Payment method
                </label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {errorSurface()}

              {!mutation.isError && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    aria-busy={mutation.isPending}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Recording…' : 'Record payment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate(-1)}
                    className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </AuthRoleGate>
    </div>
  )
}
