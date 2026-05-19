export type WorkOrderStatus =
  | 'Draft'
  | 'Sent'
  | 'Accepted'
  | 'Scheduled'
  | 'InProgress'
  | 'Completed'
  | 'OnHold'
  | 'Cancelled'

export const WORK_ORDER_STATUS_CLASSES: Record<WorkOrderStatus | string, string> = {
  Draft:      'bg-blue-100 text-blue-700',
  Sent:       'bg-purple-100 text-purple-700',
  Accepted:   'bg-indigo-100 text-indigo-700',
  Scheduled:  'bg-yellow-100 text-yellow-700',
  InProgress: 'bg-orange-100 text-orange-700',
  Completed:  'bg-green-100 text-green-700',
  OnHold:     'bg-gray-100 text-gray-700',
  Cancelled:  'bg-red-100 text-red-700',
}

interface WorkOrderStatusBadgeProps {
  status: string
  className?: string
}

export function WorkOrderStatusBadge({ status, className = '' }: WorkOrderStatusBadgeProps) {
  const colorClass = WORK_ORDER_STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`.trim()}
    >
      {status}
    </span>
  )
}
