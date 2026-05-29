import { setupServer } from 'msw/node'
import { onboardingHandlers } from './onboarding-handlers'
import { unitsHandlers } from './units-handlers'
import { authHandlers } from './auth-handlers'

export const server = setupServer(...onboardingHandlers, ...unitsHandlers, ...authHandlers)
