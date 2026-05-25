/**
 * Contract tests for reports.ts ProblemDetails error handling.
 * Per ADR 0093 Amendment J: fetch layer must read body.title (RFC 7807)
 * as the discriminator, propagate typed errors for known 400 titles,
 * and fall through to a generic Error for non-ProblemDetails paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  runTrialBalance,
  ProblemDetailsError,
  InvalidChartIdError,
  TenantBoundaryViolationError,
} from '../reports'

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeProblemJsonResponse(body: { title: string; status: number; detail?: string }) {
  return new Response(JSON.stringify(body), {
    status: body.status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function makeGenericErrorResponse(status: number, statusText: string) {
  return new Response('Internal Server Error', {
    status,
    statusText,
  })
}

describe('runReport() ProblemDetails contract — ADR 0093 Amendment J', () => {
  it('throws InvalidChartIdError when Bridge returns 400 invalid_chart_id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeProblemJsonResponse({
          title: 'invalid_chart_id',
          status: 400,
          detail: 'ChartId does not belong to the current tenant',
        }),
      ),
    )

    await expect(
      runTrialBalance({ chartId: 'bad-chart-id' }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof InvalidChartIdError &&
        err.title === 'invalid_chart_id' &&
        err.status === 400 &&
        err.detail === 'ChartId does not belong to the current tenant',
    )
  })

  it('throws TenantBoundaryViolationError when Bridge returns 400 tenant_boundary_violation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeProblemJsonResponse({
          title: 'tenant_boundary_violation',
          status: 400,
          detail: 'ChartId tenant boundary violation',
        }),
      ),
    )

    await expect(
      runTrialBalance({ chartId: 'cross-tenant-chart' }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof TenantBoundaryViolationError &&
        err.title === 'tenant_boundary_violation' &&
        err.status === 400,
    )
  })

  it('throws generic ProblemDetailsError for unrecognised problem titles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeProblemJsonResponse({
          title: 'some_other_problem',
          status: 422,
          detail: 'Unprocessable entity',
        }),
      ),
    )

    await expect(
      runTrialBalance({ chartId: 'any-chart' }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ProblemDetailsError &&
        !(err instanceof InvalidChartIdError) &&
        !(err instanceof TenantBoundaryViolationError) &&
        err.title === 'some_other_problem' &&
        err.status === 422,
    )
  })

  it('falls through to generic Error for non-ProblemDetails non-OK responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeGenericErrorResponse(503, 'Service Unavailable')),
    )

    await expect(
      runTrialBalance({ chartId: 'any-chart' }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof Error &&
        !(err instanceof ProblemDetailsError) &&
        (err as Error).message.includes('503'),
    )
  })
})
