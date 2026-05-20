import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLeases } from '@/hooks/useLeases'
import { recordPayment } from '@/api/erpnext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PAYMENT_METHODS = ['ACH', 'Check', 'Cash', 'Card'] as const

interface PaymentFormData {
  lease: string
  amount: string
  date: string
  method: string
}

export function RentCollectionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: leases, isPending: leasesPending } = useLeases()
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [confirmedLease, setConfirmedLease] = useState<string>('')
  const [confirmedAmount, setConfirmedAmount] = useState<string>('')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    defaultValues: {
      lease: searchParams.get('lease') ?? '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      method: 'ACH',
    },
  })

  const selectedLease = watch('lease')

  const mutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: (payment, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      setConfirmedLease(variables.Lease)
      setConfirmedAmount(String(variables.Amount))
      setConfirmation(payment.name)
    },
  })

  function onSubmit(data: PaymentFormData) {
    mutation.mutate({
      Lease: data.lease,
      Amount: parseFloat(data.amount),
      Date: data.date,
      PaymentMethod: data.method,
    })
  }

  if (confirmation) {
    const lease = leases?.find((l) => l.leaseId === confirmedLease)
    return (
      <div className="max-w-md">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-800">Payment recorded</h2>
          <p className="mt-1 text-sm text-gray-700">
            <strong>${parseFloat(confirmedAmount).toLocaleString()}</strong> recorded for{' '}
            {lease?.tenantDisplayName ?? confirmedLease} (ref: {confirmation}).
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Verify in ERPNext admin that the ledger entry is correct.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setConfirmation(null)
                reset({ lease: '', amount: '', date: new Date().toISOString().slice(0, 10), method: 'ACH' })
              }}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Record another
            </button>
            <Link
              to={`/leases/${confirmedLease}`}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              View lease
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Record Rent Payment</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="lease">
                Lease
              </label>
              <select
                id="lease"
                {...register('lease', { required: 'Please select a lease' })}
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
              {errors.lease && (
                <p className="mt-1 text-xs text-red-600">{errors.lease.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="amount">
                Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
              )}
              {selectedLease && leases && (
                <p className="mt-1 text-xs text-gray-500">
                  Monthly rent: $
                  {leases.find((l) => l.leaseId === selectedLease)?.monthlyRent.toLocaleString() ?? '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="date">
                Payment date
              </label>
              <input
                id="date"
                type="date"
                {...register('date', { required: 'Date is required' })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.date && (
                <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="method">
                Payment method
              </label>
              <select
                id="method"
                {...register('method')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {mutation.isError && (
              <div className="rounded border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{(mutation.error as Error).message}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
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
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
