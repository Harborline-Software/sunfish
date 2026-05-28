import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SignupDiscriminator } from '../onboarding-discriminators'

// Cross-stack byte-equality: TS const values must match C# string literals exactly.
// The C# mirror is signal-bridge/Sunfish.Bridge.Onboarding/OnboardingDiscriminators.cs.
//
// This test ONLY runs locally (skip guard below) because CI doesn't checkout
// signal-bridge alongside sunfish. The MSW-vs-Bridge parity suite covers runtime
// equivalence after W#80 PR 1.5 ships; this test pins the source-level contract.

const CS_FILE = resolve(
  __dirname,
  '../../../../../../../../signal-bridge/Sunfish.Bridge.Onboarding/OnboardingDiscriminators.cs',
)

function tryReadCsFile(): string | null {
  try {
    return readFileSync(CS_FILE, 'utf-8')
  } catch {
    return null
  }
}

function parseCsDiscriminators(src: string): Record<string, string> {
  const result: Record<string, string> = {}
  // Matches: public const string SomeName = "some_value";
  const pattern = /public\s+const\s+string\s+(\w+)\s*=\s*"([^"]+)"\s*;/g
  let m: RegExpExecArray | null
  while ((m = pattern.exec(src)) !== null) {
    result[m[1]!] = m[2]!
  }
  return result
}

const csSrc = tryReadCsFile()
const csFilePresent = csSrc !== null
const csConstants = csFilePresent ? parseCsDiscriminators(csSrc!) : {}

// Maps TS value → C# property name (PascalCase)
const MAPPING: Array<[string, string]> = [
  [SignupDiscriminator.VALIDATION_FAILED,          'ValidationFailed'],
  [SignupDiscriminator.TENANT_SLUG_TAKEN,          'TenantSlugTaken'],
  [SignupDiscriminator.TENANT_SLUG_RESERVED,       'TenantSlugReserved'],
  [SignupDiscriminator.TENANT_SLUG_INVALID_SHAPE,  'TenantSlugInvalidShape'],
  [SignupDiscriminator.VERIFICATION_TOKEN_INVALID, 'VerificationTokenInvalid'],
  [SignupDiscriminator.VERIFICATION_TOKEN_EXPIRED, 'VerificationTokenExpired'],
  [SignupDiscriminator.CAPTCHA_FAILED,             'CaptchaFailed'],
  [SignupDiscriminator.RATE_LIMITED,               'RateLimited'],
  [SignupDiscriminator.ORIGIN_INVALID,             'OriginInvalid'],
]

describe.skipIf(!csFilePresent)('cross-stack discriminator byte-equality (local only — requires signal-bridge sibling)', () => {
  for (const [tsValue, csKey] of MAPPING) {
    it(`${csKey}: TS "${tsValue}" === C# "${csConstants[csKey] ?? '(missing)'}"`, () => {
      expect(csConstants[csKey]).toBeDefined()
      expect(tsValue).toBe(csConstants[csKey])
    })
  }
})
