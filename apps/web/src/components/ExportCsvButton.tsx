import { useState, useEffect, useRef } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/20/solid'

export interface ExportCsvButtonProps {
  enabled: boolean
  onExport: () => Promise<void>
  filename: string
}

export function ExportCsvButton({ enabled, onExport, filename: _filename }: ExportCsvButtonProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'error'>('idle')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  async function handleClick() {
    if (!enabled || status === 'exporting') return
    setStatus('exporting')
    try {
      await onExport()
      setStatus('idle')
    } catch {
      setStatus('error')
      toastTimer.current = setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className="relative inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || status === 'exporting'}
        aria-busy={status === 'exporting'}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'exporting' ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Exporting…
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </>
        )}
      </button>
      {status === 'error' && (
        <p role="alert" className="text-xs text-red-600">
          Export failed — try again
        </p>
      )}
    </div>
  )
}
