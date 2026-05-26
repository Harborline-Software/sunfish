// Single source of truth for W#79 onboarding discriminator string literals.
// Per spec §3.5 + ADR 0093 Rev 4 Amendment J + test-eng T2.
//
// Import from this file — NEVER inline these strings in handlers, tests, or components.
// The C# mirror lives at:
//   signal-bridge/Sunfish.Bridge.Onboarding/OnboardingDiscriminators.cs
// A contract test in onboarding-contract.test.ts asserts byte-for-byte equality.

export const SignupDiscriminator = {
  VALIDATION_FAILED: 'validation_failed',
  TENANT_SLUG_TAKEN: 'tenant_slug_taken',
  TENANT_SLUG_RESERVED: 'tenant_slug_reserved',
  TENANT_SLUG_INVALID_SHAPE: 'tenant_slug_invalid_shape',
  VERIFICATION_TOKEN_INVALID: 'verification_token_invalid',
  VERIFICATION_TOKEN_EXPIRED: 'verification_token_expired',
  CAPTCHA_FAILED: 'captcha_failed',
  RATE_LIMITED: 'rate_limited',
  ORIGIN_INVALID: 'origin_invalid',
} as const

export type SignupDiscriminatorValue = typeof SignupDiscriminator[keyof typeof SignupDiscriminator]
