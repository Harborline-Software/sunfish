/**
 * MSW node server for vitest (jsdom environment).
 * Import and start this from test-setup.ts.
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
