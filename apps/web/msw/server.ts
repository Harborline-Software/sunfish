import { setupServer } from 'msw/node'
import { onboardingHandlers } from './onboarding-handlers'

export const server = setupServer(...onboardingHandlers)
