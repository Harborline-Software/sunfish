import { setupServer } from 'msw/node'
import { onboardingHandlers } from './onboarding-handlers'
import { unitsHandlers } from './units-handlers'

export const server = setupServer(...onboardingHandlers, ...unitsHandlers)
