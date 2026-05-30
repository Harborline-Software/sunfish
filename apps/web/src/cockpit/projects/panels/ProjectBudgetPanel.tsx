import { useState } from 'react'
import { useProjectBudget, useInsertBudgetRevision } from '@/hooks/useProjects'
import type { BudgetRevisionInput } from '@/api/projects'

interface Props {
  projectId: string
}

export function ProjectBudgetPanel({ projectId }: Props) {
  const { data, isPending, isError, error, refetch } = useProjectBudget(projectId)
  const revisionMutation = useInsertBudgetRevision(projectId)
  const [showRevision, setShowRevision] = useState(false)

  function handleRevision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input: BudgetRevisionInput = {
      effectiveFrom: String(fd.get('effectiveFrom') ?? ''),
      lines: (data?.lines ?? []).map((l) => ({
        category: l.category,
        budgetedAmount: Number(fd.get(`amount-${l.category}`) ?? l.budgetedAmount),
      })),
    }
    revisionMutation.mutate(input, {
      onSuccess: () => setShowRevision(false),
    })
  }

  if (isPending) return <p className="text-sm text-gray-500">Loading budget…</p>
  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load budget'}</p>
        <button onClick={() => void refetch()} className="mt-2 text-xs text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }
  if (!data) return null

  const variancePct = data.totalBudgeted > 0
    ? ((data.totalActual - data.totalBudgeted) / data.totalBudgeted) * 100
    : 0

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total budgeted</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">${data.totalBudgeted.toLocaleString()}</p>
          <p className="text-xs text-gray-400">effective {data.effectiveFrom}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total actual</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">${data.totalActual.toLocaleString()}</p>
        </div>
        <div className={`rounded-lg border p-4 ${variancePct > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <p className="text-xs text-gray-500">Variance</p>
          <p className={`mt-1 text-2xl font-bold ${variancePct > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Budget lines</h3>
          <button
            onClick={() => setShowRevision((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            New revision
          </button>
        </div>

        {showRevision && (
          <div className="border-b border-gray-200 bg-gray-50 p-4">
            <form onSubmit={handleRevision} className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Effective from *</label>
                <input name="effectiveFrom" type="date" required className="ml-2 rounded border border-gray-300 px-2 py-1 text-xs" />
              </div>
              {data.lines.map((l) => (
                <div key={l.category} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-gray-600">{l.category}</span>
                  <input
                    name={`amount-${l.category}`}
                    type="number"
                    defaultValue={l.budgetedAmount}
                    className="w-28 rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={revisionMutation.isPending}
                  className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {revisionMutation.isPending ? 'Saving…' : 'Save revision'}
                </button>
                <button type="button" onClick={() => setShowRevision(false)} className="text-xs text-gray-500">Cancel</button>
                {revisionMutation.isError && (
                  <p className="text-xs text-red-600">{revisionMutation.error instanceof Error ? revisionMutation.error.message : 'Failed'}</p>
                )}
              </div>
            </form>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-right">Budgeted</th>
              <th className="px-4 py-2 text-right">Actual</th>
              <th className="px-4 py-2 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.lines.map((line) => {
              const remaining = line.budgetedAmount - line.actualAmount
              return (
                <tr key={line.category}>
                  <td className="px-4 py-2 text-gray-800">{line.category}</td>
                  <td className="px-4 py-2 text-right text-gray-700">${line.budgetedAmount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-700">${line.actualAmount.toLocaleString()}</td>
                  <td className={`px-4 py-2 text-right font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    ${Math.abs(remaining).toLocaleString()}{remaining < 0 ? ' over' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
