import { describe, it, expect } from 'vitest'
import { ProblemDetailsError, throwFromResponse } from '../problem-details'

function makeProblemResp(body: object, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function makeTextResp(body: string, status = 500): Response {
  return new Response(body, {
    status,
    statusText: 'Internal Server Error',
    headers: { 'Content-Type': 'text/plain' },
  })
}

describe('ProblemDetailsError', () => {
  it('formats message with detail when present', () => {
    const err = new ProblemDetailsError('invalid_chart_id', 400, 'Chart not found')
    expect(err.message).toBe('invalid_chart_id: Chart not found')
    expect(err.title).toBe('invalid_chart_id')
    expect(err.status).toBe(400)
    expect(err.detail).toBe('Chart not found')
  })

  it('formats message without detail when absent', () => {
    const err = new ProblemDetailsError('tenant_boundary_violation', 403)
    expect(err.message).toBe('tenant_boundary_violation (HTTP 403)')
    expect(err.detail).toBeUndefined()
  })

  it('is instanceof Error', () => {
    expect(new ProblemDetailsError('t', 400)).toBeInstanceOf(Error)
  })
})

describe('throwFromResponse', () => {
  it('throws ProblemDetailsError for application/problem+json response', async () => {
    const resp = makeProblemResp({ title: 'some_error', status: 400, detail: 'bad input' })
    await expect(throwFromResponse(resp, 'Op failed')).rejects.toBeInstanceOf(ProblemDetailsError)
    const resp2 = makeProblemResp({ title: 'some_error', status: 400, detail: 'bad input' })
    await expect(throwFromResponse(resp2, 'Op failed')).rejects.toMatchObject({
      title: 'some_error',
      status: 400,
      detail: 'bad input',
    })
  })

  it('uses HTTP status as title fallback when title is absent', async () => {
    const resp = makeProblemResp({ detail: 'oops' }, 422)
    await expect(throwFromResponse(resp, 'Op failed')).rejects.toMatchObject({
      title: 'HTTP 422',
      status: 422,
    })
  })

  it('throws generic Error for non-ProblemDetails response', async () => {
    const resp = makeTextResp('Internal error', 500)
    await expect(throwFromResponse(resp, 'Op failed')).rejects.toThrow('Op failed: 500')
    const resp2 = makeTextResp('Internal error', 500)
    await expect(throwFromResponse(resp2, 'Op failed')).rejects.not.toBeInstanceOf(ProblemDetailsError)
  })

  it('calls discriminator factory when title matches', async () => {
    class CustomError extends ProblemDetailsError {
      constructor(status: number, detail?: string) {
        super('custom_title', status, detail)
        this.name = 'CustomError'
      }
    }
    const discriminators = {
      custom_title: (s: number, d?: string) => { throw new CustomError(s, d) },
    }
    const resp = makeProblemResp({ title: 'custom_title', status: 400 })
    await expect(throwFromResponse(resp, 'Op', discriminators)).rejects.toBeInstanceOf(CustomError)
  })

  it('falls back to ProblemDetailsError when discriminator has no match', async () => {
    const discriminators = {
      known_title: (_s: number) => { throw new Error('should not reach') },
    }
    const resp = makeProblemResp({ title: 'unknown_title', status: 404 })
    await expect(throwFromResponse(resp, 'Op', discriminators)).rejects.toBeInstanceOf(ProblemDetailsError)
    const resp2 = makeProblemResp({ title: 'unknown_title', status: 404 })
    await expect(throwFromResponse(resp2, 'Op', discriminators)).rejects.toMatchObject({ title: 'unknown_title' })
  })
})
