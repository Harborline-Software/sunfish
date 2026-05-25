import { describe, it, expect } from 'vitest'
import { assertDefined, narrowToNonNull, isPaymentMethod } from './type-narrowing'

describe('assertDefined', () => {
  it('passes through a defined value', () => {
    const val = assertDefined as unknown as (v: unknown, m: string) => void
    expect(() => assertDefined('hello', 'should not throw')).not.toThrow()
    void val
  })

  it('returns void for defined values (asserts inferred)', () => {
    const x: string | null = 'hello'
    assertDefined(x, 'x should be defined')
    // x is narrowed to string here — TS compile verifies this
    expect(x.length).toBe(5)
  })

  it('throws for null with the provided message', () => {
    expect(() => assertDefined(null, 'lease ID is required')).toThrow(
      'assertDefined: lease ID is required',
    )
  })

  it('throws for undefined with the provided message', () => {
    expect(() => assertDefined(undefined, 'tenant not found')).toThrow(
      'assertDefined: tenant not found',
    )
  })

  it('passes through falsy-but-defined values (0, false, empty string)', () => {
    expect(() => assertDefined(0, 'zero is defined')).not.toThrow()
    expect(() => assertDefined(false, 'false is defined')).not.toThrow()
    expect(() => assertDefined('', 'empty string is defined')).not.toThrow()
  })
})

describe('narrowToNonNull', () => {
  it('returns the value unchanged when defined', () => {
    expect(narrowToNonNull('hello')).toBe('hello')
    expect(narrowToNonNull(42)).toBe(42)
    expect(narrowToNonNull(false)).toBe(false)
  })

  it('converts null to undefined', () => {
    expect(narrowToNonNull(null)).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(narrowToNonNull(undefined)).toBeUndefined()
  })

  it('works with object values', () => {
    const obj = { leaseId: 'LEASE-001' }
    expect(narrowToNonNull(obj)).toBe(obj)
  })
})

describe('isPaymentMethod', () => {
  it('returns true for all valid payment methods', () => {
    expect(isPaymentMethod('Cash')).toBe(true)
    expect(isPaymentMethod('Check')).toBe(true)
    expect(isPaymentMethod('ACH')).toBe(true)
    expect(isPaymentMethod('Card')).toBe(true)
  })

  it('returns false for lowercase variants', () => {
    expect(isPaymentMethod('cash')).toBe(false)
    expect(isPaymentMethod('check')).toBe(false)
    expect(isPaymentMethod('ach')).toBe(false)
    expect(isPaymentMethod('card')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isPaymentMethod('')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isPaymentMethod(null)).toBe(false)
    expect(isPaymentMethod(undefined)).toBe(false)
  })

  it('returns false for numeric and boolean values', () => {
    expect(isPaymentMethod(1)).toBe(false)
    expect(isPaymentMethod(true)).toBe(false)
  })

  it('returns false for unrecognized strings', () => {
    expect(isPaymentMethod('Wire')).toBe(false)
    expect(isPaymentMethod('Crypto')).toBe(false)
  })
})
