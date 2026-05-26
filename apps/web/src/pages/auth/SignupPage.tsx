// W#79 PR 2 — SignupPage (Cycle-1 DRAFT / AMBER posture)
// Pattern: pattern-009-w79-onboarding-signup-pair (standing instance)
//
// Cycle-1 posture per ADR 0093 Amendment L:
// - Form is rendered and wired to /api/v1/auth/signup
// - If Bridge handler not yet live (501), banner renders cleanly below form
// - TODO(w79-pr1): remove SERVICE_NOT_YET_AVAILABLE banner once PR 1 handler bodies land

import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CaptchaWidget } from '@/components/CaptchaWidget'
import {
  useSignup,
  TenantSlugTakenError,
  TenantSlugReservedError,
  TenantSlugInvalidShapeError,
  CaptchaFailedError,
  RateLimitedError,
} from '@/api/onboarding'

const TENANT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/

const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  tenant_slug: z
    .string()
    .min(3, 'Organization name must be 3–32 characters')
    .max(32, 'Organization name must be 3–32 characters')
    .regex(TENANT_SLUG_PATTERN, 'Lowercase letters, numbers, and hyphens only; cannot start or end with a hyphen'),
  tenant_display_name: z.string().min(1, 'Display name is required').max(120, 'Display name is too long'),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const mutation = useSignup()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const emailId = useId()
  const passwordId = useId()
  const slugId = useId()
  const displayNameId = useId()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = (data: SignupFormValues) => {
    if (!captchaToken) {
      setCaptchaError('Please complete the verification')
      return
    }
    setCaptchaError(null)

    mutation.mutate(
      {
        email: data.email,
        password: data.password,
        tenant_slug: data.tenant_slug,
        tenant_display_name: data.tenant_display_name,
        captcha_token: captchaToken,
      },
      {
        onSuccess: (result) => {
          navigate('/auth/verify-email/pending', {
            state: { email_dispatch_id: result.email_dispatch_id, email: data.email },
          })
        },
        onError: (err) => {
          if (err instanceof TenantSlugTakenError || err instanceof TenantSlugReservedError) {
            setError('tenant_slug', { message: err.message })
          } else if (err instanceof TenantSlugInvalidShapeError) {
            setError('tenant_slug', { message: err.message })
          } else if (err instanceof CaptchaFailedError) {
            setCaptchaToken(null)
            setCaptchaError(err.message)
          }
        },
      },
    )
  }

  // Handles both 501 (not_implemented; post-PR-1 window) and 404 (TenantSubdomainResolutionMiddleware
  // intercepts apex-pipeline routes in PR 0 window before UseWhen bootstrap branch lands in PR 1).
  const isServiceUnavailable =
    mutation.isError &&
    mutation.error instanceof Error &&
    (mutation.error.message.includes('not_implemented') || mutation.error.message === 'signup failed: 404')

  const isKnownFieldError =
    mutation.isError && (
      mutation.error instanceof TenantSlugTakenError ||
      mutation.error instanceof TenantSlugReservedError ||
      mutation.error instanceof TenantSlugInvalidShapeError ||
      mutation.error instanceof CaptchaFailedError
    )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </a>
          </p>
        </div>

        {/* TODO(w79-pr1): remove this banner once PR 1 handler bodies land and 501s stop */}
        {isServiceUnavailable && (
          <div
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
          >
            Account creation isn't available yet — check back soon.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor={emailId} className="block text-sm font-medium text-gray-700">
              Work email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              aria-required="true"
              {...register('email')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@company.com"
            />
            {errors.email && (
              <p role="alert" className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="new-password"
              aria-required="true"
              {...register('password')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="At least 12 characters"
            />
            {errors.password && (
              <p role="alert" className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor={displayNameId} className="block text-sm font-medium text-gray-700">
              Organization name
            </label>
            <input
              id={displayNameId}
              type="text"
              autoComplete="organization"
              aria-required="true"
              {...register('tenant_display_name')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Acme Property Management"
            />
            {errors.tenant_display_name && (
              <p role="alert" className="text-xs text-red-600">{errors.tenant_display_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor={slugId} className="block text-sm font-medium text-gray-700">
              Organization URL
            </label>
            <div className="flex rounded-md border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="flex items-center rounded-l-md border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                sunfish.app/
              </span>
              <input
                id={slugId}
                type="text"
                autoComplete="off"
                aria-required="true"
                {...register('tenant_slug')}
                className="block w-full rounded-r-md px-3 py-2 text-sm placeholder-gray-400 focus:outline-none"
                placeholder="acme-properties"
              />
            </div>
            {errors.tenant_slug && (
              <p role="alert" className="text-xs text-red-600">{errors.tenant_slug.message}</p>
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

          {mutation.isError && !isServiceUnavailable && !isKnownFieldError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {mutation.error instanceof RateLimitedError
                ? `Too many attempts — please wait ${mutation.error.retryAfterSeconds} seconds`
                : 'Something went wrong. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
