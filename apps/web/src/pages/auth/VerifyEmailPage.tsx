// W#79 PR 2 — VerifyEmailPage (Cycle-1 DRAFT / AMBER posture)
// Reads ?token= query param; submits to POST /api/v1/auth/verify-email
// TODO(w79-pr1): remove SERVICE_NOT_YET_AVAILABLE handling once PR 1 handler bodies land

import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  useVerifyEmail,
  VerificationTokenInvalidError,
  VerificationTokenExpiredError,
} from '@/api/onboarding'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mutation = useVerifyEmail()

  // token is NEVER rendered to DOM beyond the URL; it stays in the mutation call
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) return
    mutation.mutate(
      { verification_token: token },
      {
        onSuccess: (result) => {
          navigate('/auth/verified', {
            state: {
              email: result.email,
              tenant_display_name: result.tenant_display_name,
              tenant_slug: result.tenant_slug,
            },
          })
        },
      },
    )
  }, [])

  if (!token) {
    return (
      <AuthShell>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invalid link</h1>
          <p className="mt-2 text-sm text-gray-600">This verification link is missing a token.</p>
        </div>
      </AuthShell>
    )
  }

  if (mutation.isPending) {
    return (
      <AuthShell>
        <div className="text-center" aria-live="polite" aria-busy="true">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
          <p className="mt-3 text-sm text-gray-600">Verifying your email…</p>
        </div>
      </AuthShell>
    )
  }

  if (mutation.isError) {
    const err = mutation.error

    // TODO(w79-pr1): remove once handler bodies land; handles 404 (middleware intercept, PR 0 window)
    // and not_implemented (501, post-PR-1 window after UseWhen bootstrap branch ships)
    const isServiceUnavailable = err.message.includes('not_implemented') || err.message === 'verify-email failed: 404'
    if (isServiceUnavailable) {
      return (
        <AuthShell>
          <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Email verification isn't available yet — check back soon.
          </div>
        </AuthShell>
      )
    }

    if (err instanceof VerificationTokenExpiredError) {
      return (
        <AuthShell>
          <div role="alert" className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Link expired</h1>
            <p className="text-sm text-gray-600">This verification link has expired.</p>
            <a
              href="/auth/resend-verification"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Send a new link
            </a>
          </div>
        </AuthShell>
      )
    }

    if (err instanceof VerificationTokenInvalidError) {
      return (
        <AuthShell>
          <div role="alert" className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Invalid link</h1>
            <p className="text-sm text-gray-600">This verification link is invalid or has already been used.</p>
          </div>
        </AuthShell>
      )
    }

    return (
      <AuthShell>
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Something went wrong. Please try again or request a new verification link.
        </div>
      </AuthShell>
    )
  }

  return null
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
