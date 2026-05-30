/**
 * Budget panel — PM pilot.
 *
 * Named render invariants (test-eng F11):
 *   (a) current revision lines render with correct category names + amounts
 *   (b) budget-vs-actual rollup row is present and displays the actuals figure
 *   (c) "Add revision" affordance is present
 * Negative: if rollup is empty, actuals total renders as zero (not a crash).
 */
import { useState } from 'react'
import { useProjectBudget, useInsertBudgetRevision } from '@/hooks/useProjects'

interface Props {
  projectId: string
}

const EMPTY_LINE = { category: '', budgetedAmount: '', currency: 'USD' }
const EMPTY_FORM = { effectiveFrom: '', notes: '' }

export function ProjectBudgetPanel({ projectId }: Props) {
  const { data, isPending, isError, error } = useProjectBudget(projectId)
  const insertMutation = useInsertBudgetRevision(projectId)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])

  const setFormField = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const setLine = (i: number, field: keyof typeof EMPTY_LINE) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [field]: e.target.value } : l)))

  const addLine = () => setLines((ls) => [...ls, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i))

  const canSubmit =
    form.effectiveFrom &&
    lines.every((l) => l.category.trim() && l.budgetedAmount && l.currency.trim())

  const handleInsert = () => {
    if (!canSubmit) return
    insertMutation.mutate(
      {
        effectiveFrom: form.effectiveFrom,
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        lines: lines.map((l) => ({
          category: l.category.trim(),
          budgetedAmount: parseFloat(l.budgetedAmount),
          currency: l.currency.trim(),
        })),
      },
      {
        onSuccess: () => {
          setShowForm(false)
          setForm(EMPTY_FORM)
          setLines([{ ...EMPTY_LINE }])
        },
      },
    )
  }

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
  const totalActual = data.rollup.reduce((sum, r) => sum + r.actualAmount, 0)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Budget</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Add budget revision"
          >
            Add revision
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">New Budget Revision</h3>
          <div className="mb-3 flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Effective from *</label>
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={setFormField('effectiveFrom')}
                className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label="Effective from"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={setFormField('notes')}
                placeholder="Optional"
                className="w-48 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label="Revision notes"
              />
            </div>
          </div>
          <div className="mb-2 text-xs font-medium text-gray-500">Lines *</div>
          {lines.map((line, i) => (
            <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={line.category}
                onChange={setLine(i, 'category')}
                placeholder="Category"
                className="w-32 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label={`Line ${i + 1} category`}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.budgetedAmount}
                onChange={setLine(i, 'budgetedAmount')}
                placeholder="Amount"
                className="w-28 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label={`Line ${i + 1} amount`}
              />
              <input
                type="text"
                value={line.currency}
                onChange={setLine(i, 'currency')}
                placeholder="USD"
                maxLength={3}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                aria-label={`Line ${i + 1} currency`}
              />
              {lines.length > 1 && (
                <button
                  onClick={() => removeLine(i)}
                  className="text-xs text-red-400 hover:text-red-600"
                  aria-label={`Remove line ${i + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button onClick={addLine} className="mb-3 text-xs text-blue-600 hover:text-blue-800">
            + Add line
          </button>
          {insertMutation.isError && (
            <p className="mb-2 text-xs text-red-600">
              {insertMutation.error instanceof Error
                ? insertMutation.error.message
                : 'Failed to insert revision'}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleInsert}
              disabled={insertMutation.isPending || !canSubmit}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {insertMutation.isPending ? 'Saving…' : 'Insert'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setForm(EMPTY_FORM)
                setLines([{ ...EMPTY_LINE }])
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!revision && (
        <p className="py-4 text-sm text-gray-500">No budget revisions yet.</p>
      )}

      {revision && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4 font-medium">Category</th>
              <th className="pb-2 text-right font-medium">Budgeted</th>
            </tr>
          </thead>
          <tbody>
            {revision.lines.map((line) => (
              <tr key={line.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 text-gray-700">{line.category}</td>
                <td className="py-2 text-right tabular-nums text-gray-900">
                  {line.budgetedAmount.toLocaleString('en-US', { style: 'currency', currency: line.currency })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-medium">
              <td className="py-2 pr-4 text-gray-900">Budget total</td>
              <td className="py-2 text-right tabular-nums text-gray-900">
                {revision.lines
                  .reduce((sum, l) => sum + l.budgetedAmount, 0)
                  .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 pr-4 text-gray-500">Actuals</td>
              <td className="py-2 text-right tabular-nums text-gray-500">
                {totalActual.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
