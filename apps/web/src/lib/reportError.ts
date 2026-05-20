export interface ErrorReport {
  errorId: string
  message: string
  stack?: string
  route: string
  timestamp: string
  userAgent: string
}

export function generateErrorId(): string {
  return crypto.randomUUID()
}

export async function reportError(error: Error, errorId: string): Promise<void> {
  const report: ErrorReport = {
    errorId,
    message: error.message,
    stack: error.stack,
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  }
  try {
    await fetch('/api/v1/telemetry/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })
  } catch {
    // best-effort; never throw
  }
}
