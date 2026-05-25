export interface RunButtonProps {
  onClick: () => void
  enabled: boolean
  isRunning: boolean
}

export function RunButton({ onClick, enabled, isRunning }: RunButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled || isRunning}
      aria-busy={isRunning}
      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRunning ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Running…
        </>
      ) : (
        'Run report'
      )}
    </button>
  )
}
