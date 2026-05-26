// W#79 PR 2 — VerifyEmailPendingPage
// Static "check your inbox" page; reached after successful signup (202 accepted).
// Receives email + email_dispatch_id via location.state from SignupPage navigation.

import { useLocation } from 'react-router-dom'
import { useResendVerification, CaptchaFailedError, RateLimitedError } from '@/api/onboarding'
import { CaptchaWidget, MOCK_CAPTCHA_TOKEN } from '@/components/CaptchaWidget'
import { useState } from 'react'

interface LocationState {
  email?: string
  email_dispatch_id?: string
}

export function VerifyEmailPendingPage() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const email = state?.email ?? 'your email address'

  const resendMutation = useResendVerification()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [resendSent, setResendSent] = useState(false)

  function handleResend() {
    if (!state?.email) return
    const token = captchaToken ?? MOCK_CAPTCHA_TOKEN

    resendMutation.mutate(
      { email: state.email, captcha_token: token },
      {
        onSuccess: () => setResendSent(true),
      },
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-gray-600">
            We sent a verification link to{' '}
            <span className="font-medium text-gray-900">{email}</span>.
            Click the link to activate your account.
          </p>
        </div>

        {resendSent ? (
          <p role="status" className="text-sm text-green-700">
            A new verification link was sent.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-gray-500">
            <p>Didn't receive it? Check your spam folder, or</p>
            <div className="space-y-2">
              <CaptchaWidget onToken={setCaptchaToken} />
              <button
                type="button"
                onClick={handleResend}
                disabled={resendMutation.isPending || !state?.email}
                aria-busy={resendMutation.isPending}
                className="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                {resendMutation.isPending ? 'Sending…' : 'resend the verification email'}
              </button>
            </div>
            {resendMutation.isError && (
              <p role="alert" className="text-xs text-red-600">
                {resendMutation.error instanceof RateLimitedError
                  ? `Please wait ${resendMutation.error.retryAfterSeconds} seconds before trying again`
                  : resendMutation.error instanceof CaptchaFailedError
                    ? resendMutation.error.message
                    : 'Could not resend — please try again'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
