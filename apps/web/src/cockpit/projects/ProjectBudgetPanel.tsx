/**
 * Budget panel — PM pilot.
 *
 * DTO shapes partially deferred to Engineer PR 1 reconciliation (test-eng F9).
 * The mock fixtures in tests use provisional shapes; update to match PR 1's
 * actual ProjectBudget / ProjectBudgetLine models before PR 4 is opened.
 *
 * Named render invariants (test-eng F11):
 *   (a) current revision lines render with correct category names + amounts
 *   (b) budget-vs-actual rollup row is present and displays the actuals figure
 *   (c) "Add revision" affordance is present
 * Negative: if actuals data is absent, rollup renders as zero (not a crash).
 */
import { useProjectBudget } from '@/hooks/useProjects'

interface Props {
  projectId: string
}

export function ProjectBudgetPanel({ projectId }: Props) {
  const { data, isPending, isError, error } = useProjectBudget(projectId)

  if (isPending) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading budget…</p>
  }

  if (isError) {
    return (
      <p className="py-4 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Failed to load budget'}
      </p>
    )
  }

  if (!data) return null

  const revision = data.currentRevision

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Budget</h2>
        <button className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          Add revision
        </button>
      </div>

      {!revision && (
        <p className="py-4 text-sm text-gray-500">No budget revisions yet.</p>
      )}

      {revision && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4 font-medium">Category</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {revision.lines.map((line) => (
              <tr key={line.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 text-gray-700">{line.category}</td>
                <td className="py-2 text-right tabular-nums text-gray-900">
                  {line.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-medium">
              <td className="py-2 pr-4 text-gray-900">Budget total</td>
              <td className="py-2 text-right tabular-nums text-gray-900">
                {revision.lines
                  .reduce((sum, l) => sum + l.amount, 0)
                  .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 pr-4 text-gray-500">Actuals</td>
              <td className="py-2 text-right tabular-nums text-gray-500">
                {(data.totalActual ?? 0).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
