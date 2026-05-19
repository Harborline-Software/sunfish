export type AgingBucketDays = number
export type AgingBucketEnum =
  | 'Current'
  | 'Days0To30'
  | 'Days31To60'
  | 'Days61To90'
  | 'Days90Plus'
  | 'NoBalance'

type AgingPillProps =
  | { days: AgingBucketDays; bucket?: never }
  | { bucket: AgingBucketEnum; days?: never }

function bucketFromDays(days: number): AgingBucketEnum {
  if (days <= 0) return 'Current'
  if (days <= 30) return 'Days0To30'
  if (days <= 60) return 'Days31To60'
  if (days <= 90) return 'Days61To90'
  return 'Days90Plus'
}

const BUCKET_STYLES: Record<AgingBucketEnum, string> = {
  NoBalance:   '',
  Current:     'text-gray-600',
  Days0To30:   'text-gray-700',
  Days31To60:  'rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700',
  Days61To90:  'rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700',
  Days90Plus:  'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700',
}

const BUCKET_LABELS: Record<AgingBucketEnum, string> = {
  NoBalance:   '—',
  Current:     'Current',
  Days0To30:   '0–30 d',
  Days31To60:  '31–60 d',
  Days61To90:  '61–90 d',
  Days90Plus:  '90+ d',
}

export function AgingBucketPill({ days, bucket }: AgingPillProps) {
  const resolved: AgingBucketEnum = bucket ?? (days !== undefined ? bucketFromDays(days) : 'NoBalance')
  const className = BUCKET_STYLES[resolved]
  const label = days !== undefined && resolved !== 'NoBalance'
    ? `${days} days`
    : BUCKET_LABELS[resolved]

  if (!className) return <span className="text-gray-400">—</span>
  return <span className={className}>{label}</span>
}
