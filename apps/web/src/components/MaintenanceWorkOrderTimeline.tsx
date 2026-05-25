import { useMemo } from 'react'
import type { WorkOrderSummary } from '@/api/maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── date helpers ──────────────────────────────────────────────────────────────

function parseUtcDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!))
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

// ── status appearance ─────────────────────────────────────────────────────────

const BAR_COLORS: Record<string, string> = {
  Draft:      'bg-blue-100 border-blue-300',
  Sent:       'bg-purple-100 border-purple-300',
  Accepted:   'bg-indigo-100 border-indigo-300',
  Scheduled:  'bg-amber-200 border-amber-400',
  InProgress: 'bg-orange-300 border-orange-500',
  Completed:  'bg-green-200 border-green-400',
  OnHold:     'bg-gray-200 border-gray-400',
  Cancelled:  'bg-red-100 border-red-300',
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'

const BADGE_VARIANTS: Record<string, BadgeVariant> = {
  Draft:      'secondary',
  Sent:       'secondary',
  Accepted:   'default',
  Scheduled:  'warning',
  InProgress: 'warning',
  Completed:  'success',
  OnHold:     'outline',
  Cancelled:  'destructive',
}

// ── component ─────────────────────────────────────────────────────────────────

// WorkOrderSummary does not include propertyId; grouping by property requires
// the Bridge endpoint to expose that field in the response DTO.
// TODO: once propertyId is in WorkOrderSummary, switch flat rows to property sections.

const LABEL_COL_W = 168 // px

interface Props {
  items: WorkOrderSummary[]
}

export function MaintenanceWorkOrderTimeline({ items }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  }, [])

  const { rangeStart, totalDays, todayPct, ticks } = useMemo(() => {
    const dates: Date[] = [today]
    for (const wo of items) {
      const s = parseUtcDate(wo.scheduledDate)
      const e = parseUtcDate(wo.completedDate) ?? parseUtcDate(wo.appointmentDate)
      if (s) dates.push(s)
      if (e) dates.push(e)
    }

    const minD = dates.reduce((a, b) => (a < b ? a : b))
    const maxD = dates.reduce((a, b) => (a > b ? a : b))
    const start = addDays(minD, -3)
    const rawEnd = addDays(maxD, 3)
    const end = daysBetween(start, rawEnd) < 30 ? addDays(start, 30) : rawEnd
    const total = daysBetween(start, end)

    // weekly tick marks (Sundays)
    const tickMarks: { label: string; pct: number }[] = []
    let tick = addDays(start, (7 - start.getUTCDay()) % 7)
    while (tick <= end) {
      tickMarks.push({ label: fmtMonthDay(tick), pct: (daysBetween(start, tick) / total) * 100 })
      tick = addDays(tick, 7)
    }

    return {
      rangeStart: start,
      totalDays: total,
      todayPct: (daysBetween(start, today) / total) * 100,
      ticks: tickMarks,
    }
  }, [items, today])

  const showToday = todayPct >= 0 && todayPct <= 100

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-500">
          No work orders to display on the timeline.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Work Order Timeline</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div
          className="min-w-[600px]"
          role="list"
          aria-label="Maintenance work order timeline"
        >
          {/* date header */}
          <div className="flex items-end border-b border-gray-200 bg-gray-50 select-none">
            <div
              style={{ width: LABEL_COL_W, minWidth: LABEL_COL_W }}
              className="shrink-0 px-3 py-2 text-xs font-medium text-gray-500"
            >
              Work Order
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

          {/* rows — one per work order */}
          {items.map((wo) => {
            const barStart = parseUtcDate(wo.scheduledDate)
            const barEnd =
              parseUtcDate(wo.completedDate) ??
              parseUtcDate(wo.appointmentDate) ??
              (barStart ? addDays(barStart, 7) : null)
            const hasBar = barStart !== null && barEnd !== null

            const leftPct = hasBar
              ? Math.max(0, (daysBetween(rangeStart, barStart) / totalDays) * 100)
              : 0
            const widthPct = hasBar
              ? Math.max(0.8, (daysBetween(barStart, barEnd) / totalDays) * 100)
              : 0

            const label = [
              wo.workOrderId.slice(-8),
              wo.status,
              wo.scheduledDate ? `scheduled ${wo.scheduledDate}` : 'no date',
              wo.completedDate ? `completed ${wo.completedDate}` : null,
            ]
              .filter(Boolean)
              .join(' — ')

            return (
              <div
                key={wo.workOrderId}
                role="listitem"
                tabIndex={0}
                aria-label={label}
                className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              >
                {/* label column */}
                <div
                  style={{ width: LABEL_COL_W, minWidth: LABEL_COL_W }}
                  className="shrink-0 flex items-center gap-2 px-3 py-2"
                >
                  <span className="font-mono text-xs text-gray-500 truncate leading-none">
                    {wo.workOrderId.slice(-8)}
                  </span>
                  <Badge
                    variant={BADGE_VARIANTS[wo.status] ?? 'outline'}
                    className="text-xs shrink-0 leading-none"
                  >
                    {wo.status}
                  </Badge>
                </div>

                {/* bar track */}
                <div className="relative flex-1 h-10 py-2.5">
                  {showToday && (
                    <div
                      className="absolute inset-y-0 w-px bg-blue-400 opacity-30 pointer-events-none"
                      style={{ left: `${todayPct}%` }}
                      aria-hidden="true"
                    />
                  )}
                  {hasBar ? (
                    <div
                      className={cn(
                        'absolute inset-y-2 rounded border',
                        BAR_COLORS[wo.status] ?? 'bg-gray-100 border-gray-300',
                      )}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="absolute inset-0 flex items-center px-1 text-xs text-gray-400 italic"
                      aria-hidden="true"
                    >
                      no date
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      {/* status legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 px-4 pb-3 pt-2">
        {Object.entries(BAR_COLORS).map(([status, cls]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={cn('inline-block h-2.5 w-4 rounded-sm border', cls)} aria-hidden="true" />
            {status}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-2.5 w-px bg-blue-400" aria-hidden="true" />
          Today
        </span>
      </div>
    </Card>
  )
}
