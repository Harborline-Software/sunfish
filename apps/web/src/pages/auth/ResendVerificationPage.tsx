import { useState, useId, type ReactNode, type FormEvent } from 'react'
import { useResendVerification, RateLimitedError, ValidationFailedError } from '@/api/onboarding'
import { CaptchaWidget } from '@/components/CaptchaWidget'

export function ResendVerificationPage() {
  const mutation = useResendVerification()
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const emailId = useId()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    if (!captchaToken) {
      setCaptchaError('Please complete the verification')
      return
    }
    setCaptchaError(null)
    mutation.mutate({ email, captcha_token: captchaToken })
  }

  if (mutation.isSuccess) {
    return (
      <AuthShell>
        <div className="space-y-3 text-center" role="status">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check your inbox</h1>
          <p className="text-sm text-gray-600">
            We sent a new verification link to <strong>{email}</strong>.
          </p>
        </div>
      </AuthShell>
    )
  }

  const rateLimitErr = mutation.error instanceof RateLimitedError ? mutation.error : null
  const validationErr = mutation.error instanceof ValidationFailedError ? mutation.error : null

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resend verification</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we'll send a new verification link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor={emailId} className="block text-sm font-medium text-gray-700">
              Work email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              aria-required="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@company.com"
            />
            {validationErr && (
              <p role="alert" className="text-xs text-red-600">{validationErr.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <CaptchaWidget
              onToken={(token) => {
                setCaptchaToken(token)
                setCaptchaError(null)
              }}
            />
            {captchaError && (
              <p role="alert" className="text-xs text-red-600">{captchaError}</p>
            )}
          </div>

          {mutation.isError && !validationErr && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {rateLimitErr
                ? `Too many attempts — please wait ${rateLimitErr.retryAfterSeconds} seconds`
                : 'Something went wrong. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || !email || !captchaToken}
            aria-busy={mutation.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Sending…' : 'Send verification link'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
