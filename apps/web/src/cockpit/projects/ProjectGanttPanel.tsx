/**
 * Gantt panel — thin adapter over MaintenanceWorkOrderTimeline.
 *
 * Adapter scope (Admiral directive-amendment 0600Z, Fold 2 — pilot scope):
 * - Status passthrough: milestone statuses won't match BAR_COLORS keys → fallback gray.
 *   Gray bars are ACCEPTABLE for the pilot; milestone-status coloring is a GA follow-on.
 * - Predecessor edges: deferred (component renders flat independent bars — fine for pilot).
 * - Percent-complete fill: deferred.
 *
 * Field mapping:
 *   WorkOrderSummary.workOrderId  ← ProjectTimelineMilestone.id
 *   WorkOrderSummary.status       ← ProjectTimelineMilestone.status  (gray fallback)
 *   WorkOrderSummary.vendorId     ← '' (unused by the component's rendering)
 *   WorkOrderSummary.scheduledDate ← ProjectTimelineMilestone.plannedDate ?? ''
 *   WorkOrderSummary.completedDate ← ProjectTimelineMilestone.actualDate
 *   WorkOrderSummary.appointmentDate ← null
 */
import { useProjectTimeline } from '@/hooks/useProjects'
import { MaintenanceWorkOrderTimeline } from '@/components/MaintenanceWorkOrderTimeline'
import type { WorkOrderSummary } from '@/api/maintenance'
import type { ProjectTimelineMilestone } from '@/api/projects'

function toWorkOrderRow(m: ProjectTimelineMilestone): WorkOrderSummary {
  return {
    workOrderId:     m.id,
    status:          m.status,
    vendorId:        '',
    scheduledDate:   m.plannedDate ?? '',
    completedDate:   m.actualDate,
    appointmentDate: null,
  }
}

interface Props {
  projectId: string
}

export function ProjectGanttPanel({ projectId }: Props) {
  const { data, isPending, isError, error } = useProjectTimeline(projectId)

  if (isPending) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading timeline…</p>
  }

  if (isError) {
    return (
      <p className="py-4 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Failed to load timeline'}
      </p>
    )
  }

  if (!data) return null

  const rows = data.milestones.map(toWorkOrderRow)

  return <MaintenanceWorkOrderTimeline items={rows} />
}
