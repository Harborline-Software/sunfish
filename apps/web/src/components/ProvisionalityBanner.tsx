import { useState } from 'react'
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'

export interface ProvisionalityBannerProps {
  isProvisional: boolean
  warnings: string[]
  className?: string
}

export function ProvisionalityBanner({ isProvisional, warnings, className }: ProvisionalityBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (!isProvisional) return null

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 p-3 ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-amber-800"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        <span className="flex-1">Provisional report — data may be incomplete</span>
        {warnings.length > 0 && (
          expanded
            ? <ChevronUpIcon className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            : <ChevronDownIcon className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        )}
      </button>
      {expanded && warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 ps-6 text-xs text-amber-700">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
