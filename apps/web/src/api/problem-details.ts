/**
 * Shared RFC 7807 ProblemDetails error infrastructure — ADR 0093 Amendment J.
 * All non-OK fetch responses in apps/web/src/api/ must pass through
 * throwFromResponse() rather than throwing a generic Error directly.
 *
 * Domain-specific ProblemDetailsError subclasses live alongside the API
 * client that owns the discriminator (e.g. TenantBoundaryViolationError in
 * reports.ts). The base class and generic thrower live here.
 */

export class ProblemDetailsError extends Error {
  constructor(
    public readonly title: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(detail ? `${title}: ${detail}` : `${title} (HTTP ${status})`)
    this.name = 'ProblemDetailsError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Parses a non-OK response and throws.
 * If Content-Type is application/problem+json, reads body.title and throws
 * a ProblemDetailsError (or a discriminated subclass when a discriminators
 * map is supplied). Falls through to a generic Error for plain error responses.
 *
 * @param resp            The non-OK Response object.
 * @param genericMessage  Prefix used when the response is not ProblemDetails.
 * @param discriminators  Optional map from title string → factory. Lets callers
 *                        surface domain-specific subclasses (e.g. reports.ts).
 */
export async function throwFromResponse(
  resp: Response,
  genericMessage: string,
  discriminators: Partial<Record<string, (status: number, detail?: string) => never>> = {},
): Promise<never> {
  const contentType = resp.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/problem+json')) {
    const problem = (await resp.json()) as { title?: string; status?: number; detail?: string }
    const title = problem.title ?? `HTTP ${resp.status}`
    const status = problem.status ?? resp.status
    const detail = problem.detail
    const factory = discriminators[title]
    if (factory) return factory(status, detail)
    throw new ProblemDetailsError(title, status, detail)
  }
  throw new Error(`${genericMessage}: ${resp.status} ${resp.statusText}`)
}
