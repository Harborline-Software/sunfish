import { RunButton } from './RunButton'

export interface ReportFilterBarProps {
  children: React.ReactNode
  onRun: () => void
  canRun: boolean
  isRunning: boolean
  exportButton?: React.ReactNode
}

export function ReportFilterBar({ children, onRun, canRun, isRunning, exportButton }: ReportFilterBarProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && canRun && !isRunning) onRun()
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
      <div className="flex items-center gap-2">
        {exportButton}
        <RunButton onClick={onRun} enabled={canRun} isRunning={isRunning} />
      </div>
    </div>
  )
}
