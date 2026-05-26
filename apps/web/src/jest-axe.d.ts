export {}

declare module 'jest-axe' {
  interface JestAxeResults {
    violations: {
      id: string
      impact: string | null
      description: string
      help: string
      helpUrl: string
      nodes: unknown[]
    }[]
  }

  export function axe(
    html: Element | Document | string,
    options?: Record<string, unknown>,
  ): Promise<JestAxeResults>

  export const toHaveNoViolations: {
    toHaveNoViolations(results: JestAxeResults): { pass: boolean; message(): string }
  }
}

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
