import { Link } from 'react-router-dom'

export interface ErrorSurfaceProps {
  variant?: 'retryable' | 'reload' | 'redirect'
  title: string
  body: string
  onRetry?: () => void
  onReload?: () => void
  redirectTo?: { label: string; to: string }
}

export function ErrorSurface({
  variant = 'retryable',
  title,
  body,
  onRetry,
  onReload,
  redirectTo,
}: ErrorSurfaceProps) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="font-semibold text-red-700">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{body}</p>
      {variant === 'retryable' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Try again
        </button>
      )}
      {variant === 'reload' && (
        <button
          onClick={onReload ?? (() => window.location.reload())}
          className="mt-3 rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Reload page
        </button>
      )}
      {variant === 'redirect' && redirectTo && (
        <Link
          to={redirectTo.to}
          className="mt-3 inline-block rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          {redirectTo.label}
        </Link>
      )}
    </div>
  )
}
