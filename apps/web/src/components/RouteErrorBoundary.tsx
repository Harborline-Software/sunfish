import { useEffect, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useNavigate } from 'react-router-dom'
import { generateErrorId, reportError } from '@/lib/reportError'

function RouteErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  const errorId = useMemo(() => generateErrorId(), [error])
  const navigate = useNavigate()

  useEffect(() => {
    reportError(error, errorId).catch(() => {})
  }, [error, errorId])

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 my-4">
      <h2 className="font-semibold text-red-700">Something went wrong</h2>
      <p className="mt-1 text-sm text-gray-600">{error.message}</p>
      <p className="mt-3 font-mono text-xs text-gray-400">Error ID: {errorId}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={resetErrorBoundary}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
        <button
          onClick={() => {
            navigate('/')
            resetErrorBoundary()
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  )
}

export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={RouteErrorFallback}>
      {children}
    </ErrorBoundary>
  )
}
