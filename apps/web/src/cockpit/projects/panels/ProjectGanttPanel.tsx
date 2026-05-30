import { useMemo } from 'react'
import { useProjectTimeline } from '@/hooks/useProjects'
import type { ProjectTimelineMilestone } from '@/api/projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Gantt panel for the project detail view.
 * Adapts MaintenanceWorkOrderTimeline's bar model to ProjectTimelineDto.milestones[].
 * Thin adapter: reuses the date-math helpers, does NOT fork the WO timeline component.
 */

// ── date helpers (mirrors MaintenanceWorkOrderTimeline.tsx) ───────────────────

function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000
}

function fmtMonthDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ── appearance ────────────────────────────────────────────────────────────────

const MILESTONE_COLORS: Record<string, string> = {
  Pending:  'bg-amber-100 border-amber-300',
  Achieved: 'bg-green-200 border-green-400',
  Missed:   'bg-red-100 border-red-300',
}

const LABEL_COL_W = 180

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  projectId: string
}

export function ProjectGanttPanel({ projectId }: Props) {
  const { data, isPending, isError, error, refetch } = useProjectTimeline(projectId)

  const today = useMemo(() => {
    const d = new Date()
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  }, [])

  const layout = useMemo(() => {
    if (!data) return null
    const milestones = data.milestones

    // Collect all dates to compute range
    const dates: Date[] = [today]
    const projectStart = parseIsoDate(data.plannedStart ?? data.actualStart)
    const projectEnd = parseIsoDate(data.plannedEnd ?? data.actualEnd)
    if (projectStart) dates.push(projectStart)
    if (projectEnd) dates.push(projectEnd)
    for (const ms of milestones) {
      const d = parseIsoDate(ms.plannedDate ?? ms.actualDate)
      if (d) dates.push(d)
    }

    const minD = dates.reduce((a, b) => (a < b ? a : b))
    const maxD = dates.reduce((a, b) => (a > b ? a : b))
    const start = addDays(minD, -7)
    const rawEnd = addDays(maxD, 7)
    const end = daysBetween(start, rawEnd) < 30 ? addDays(start, 30) : rawEnd
    const total = daysBetween(start, end)

    // weekly tick marks
    const ticks: { label: string; pct: number }[] = []
    let tick = addDays(start, (7 - start.getUTCDay()) % 7)
    while (tick <= end) {
      ticks.push({ label: fmtMonthDay(tick), pct: (daysBetween(start, tick) / total) * 100 })
      tick = addDays(tick, 7)
    }

    return {
      rangeStart: start,
      totalDays: total,
      todayPct: (daysBetween(start, today) / total) * 100,
      ticks,
    }
  }, [data, today])

  if (isPending) return <p className="text-sm text-gray-500">Loading timeline…</p>
  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load timeline'}</p>
        <button onClick={() => void refetch()} className="mt-2 text-xs text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }
  if (!data || !layout) return null

  const milestones: ProjectTimelineMilestone[] = data.milestones
  const { rangeStart, totalDays, todayPct, ticks } = layout
  const showToday = todayPct >= 0 && todayPct <= 100

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-500">
          No milestones on this project yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Project Timeline · {data.percentComplete != null ? `${data.percentComplete}% complete` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[600px]" role="list" aria-label="Project milestone timeline">
          {/* date header */}
          <div className="flex items-end border-b border-gray-200 bg-gray-50 select-none">
            <div style={{ width: LABEL_COL_W, minWidth: LABEL_COL_W }} className="shrink-0 px-3 py-2 text-xs font-medium text-gray-500">
              Milestone
            </div>
            <div className="relative flex-1 h-8">
              {ticks.map((t) => (
                <span
                  key={t.pct}
                  className="absolute bottom-1 text-xs text-gray-400 -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${t.pct}%` }}
                  aria-hidden="true"
                >
                  {t.label}
                </span>
              ))}
              {showToday && (
                <div
                  className="absolute inset-y-0 w-px bg-blue-400 opacity-60"
                  style={{ left: `${todayPct}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* rows — one per milestone */}
          {milestones.map((ms) => {
            const pinDate = parseIsoDate(ms.actualDate ?? ms.plannedDate)
            const pinPct = pinDate
              ? Math.max(0, Math.min(100, (daysBetween(rangeStart, pinDate) / totalDays) * 100))
              : null

            return (
              <div
                key={ms.id}
                role="listitem"
                aria-label={`${ms.name} — ${ms.status}`}
                className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <div style={{ width: LABEL_COL_W, minWidth: LABEL_COL_W }} className="shrink-0 px-3 py-2">
                  <p className="truncate text-xs font-medium text-gray-800">{ms.name}</p>
                  <p className="text-xs text-gray-400">{ms.kind}</p>
                </div>
                <div className="relative flex-1 h-10 py-3">
                  {showToday && (
                    <div
                      className="absolute inset-y-0 w-px bg-blue-400 opacity-30 pointer-events-none"
                      style={{ left: `${todayPct}%` }}
                      aria-hidden="true"
                    />
                  )}
                  {pinPct !== null ? (
                    <div
                      className={cn('absolute h-4 w-4 rounded-full border-2 -translate-x-1/2 -translate-y-1/2 top-1/2', MILESTONE_COLORS[ms.status] ?? 'bg-gray-200 border-gray-400')}
                      style={{ left: `${pinPct}%` }}
                      title={`${ms.plannedDate ?? '—'} planned${ms.actualDate ? ` · ${ms.actualDate} actual` : ''}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center px-1 text-xs text-gray-400 italic" aria-hidden="true">
                      no date
                    </span>
                  )}
                </div>
                <div className="w-20 shrink-0 pr-3 text-right">
                  <span className={cn('rounded px-1.5 py-0.5 text-xs', MILESTONE_COLORS[ms.status] ?? 'bg-gray-100 text-gray-600')}>
                    {ms.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
