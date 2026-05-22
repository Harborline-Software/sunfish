import { useAccountingSummary, useAccountingOutstanding } from '@/hooks/useAccounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorCard } from '@/components/ErrorCard'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function DaysDuePill({ days }: { days: number }) {
  if (days <= 30) return <span className="text-gray-600">{days} days</span>
  if (days <= 60) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">{days} days</span>
  if (days <= 90) return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{days} days</span>
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{days} days</span>
}

export function AccountingPage() {
  const summaryQuery = useAccountingSummary()
  const outstandingQuery = useAccountingOutstanding()

  const isPending = summaryQuery.isPending || outstandingQuery.isPending
  const isError = summaryQuery.isError || outstandingQuery.isError

  const header = (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Accounting</h1>
      <p className="mt-1 text-sm text-gray-500">Summary of your receivables</p>
    </div>
  )

  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorCard
          variant="compact"
          title="Couldn't load accounting data"
          message="We couldn't fetch your accounting data. Try again in a moment."
          onRetry={() => {
            summaryQuery.refetch()
            outstandingQuery.refetch()
          }}
        />
      </div>
    )
  }

  const summary = summaryQuery.data
  const invoices = outstandingQuery.data?.items ?? []

  return (
    <div className="space-y-8">
      {header}

      {/* Summary tiles — 4-up grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isPending ? (
          <>
            <span className="sr-only">Loading accounting summary</span>
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} aria-busy="true">
                <CardHeader className="pb-1">
                  <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-7 w-24 rounded bg-gray-100 animate-pulse" />
                  <div className="mt-1 h-3 w-16 rounded bg-gray-100 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary?.invoicedThisPeriod ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">Received</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary?.receivedThisPeriod ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary?.outstanding ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  &gt;30 days: {formatCurrency(summary?.outstanding30Plus ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">Aging 60+</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary?.aging60Plus ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {summary?.aging60PlusCount ?? 0}{' '}
                  invoice{(summary?.aging60PlusCount ?? 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Outstanding invoices table */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Outstanding invoices</h2>
        {isPending ? (
          <div aria-busy="true">
            <span className="sr-only">Loading outstanding invoices</span>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-500">No outstanding invoices.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm" aria-label="Outstanding invoices">
            <thead>
              <tr className="border-b text-start text-gray-500">
                <th scope="col" className="pb-2 pe-4 font-medium">Invoice</th>
                <th scope="col" className="pb-2 pe-4 font-medium">Lease</th>
                <th scope="col" className="pb-2 pe-4 font-medium">Amount</th>
                <th scope="col" className="pb-2 font-medium">Days due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.invoiceId}>
                  <td className="py-2 pe-4 font-mono text-gray-500">{inv.invoiceId.slice(-8)}</td>
                  <td className="py-2 pe-4 text-gray-700">{inv.tenantDisplayName}</td>
                  <td className="py-2 pe-4 font-medium text-gray-900">{formatCurrency(inv.amount)}</td>
                  <td className="py-2">
                    <DaysDuePill days={inv.daysOverdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  )
}
