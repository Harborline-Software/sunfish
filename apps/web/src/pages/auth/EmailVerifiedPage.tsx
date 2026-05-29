// W#79 PR 4 — EmailVerifiedPage
// Reached after VerifyEmailPage successfully verifies the token.
// Receives email + tenant_display_name + tenant_slug via location.state.
// Shows success state and offers a direct link to sign in.

import { useLocation, Link, Navigate } from 'react-router-dom'

interface LocationState {
  email?: string
  tenant_display_name?: string
  tenant_slug?: string
}

export function EmailVerifiedPage() {
  const location = useLocation()
  const state = location.state as LocationState | null

  // Guard: navigating here directly (no state) is a stale/bookmarked URL.
  // Redirect to login rather than showing a broken success state.
  if (!state?.email) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Success icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email verified</h1>
          {state.tenant_display_name && (
            <p className="mt-2 text-sm text-gray-600">
              Welcome to{' '}
              <span className="font-medium text-gray-900">{state.tenant_display_name}</span>.
              Your account is ready.
            </p>
          )}
          {!state.tenant_display_name && (
            <p className="mt-2 text-sm text-gray-600">
              Your email address has been verified. You can now sign in.
            </p>
          )}
        </div>

        <Link
          to="/auth/login"
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign in to your account
        </Link>
      </div>
    </div>
  )
}
