export function assertDefined<T>(
  value: T | null | undefined,
  message: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`assertDefined: ${message}`)
  }
}

export function narrowToNonNull<T>(
  value: T | null | undefined,
): T | undefined {
  return value ?? undefined
}

export type PaymentMethod = 'Cash' | 'Check' | 'ACH' | 'Card'

const PAYMENT_METHODS: readonly PaymentMethod[] = ['Cash', 'Check', 'ACH', 'Card']

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod)
}
