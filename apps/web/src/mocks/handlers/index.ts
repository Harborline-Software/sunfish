/**
 * MSW handler registry — all endpoint families.
 * Add new handler arrays here as cockpit surfaces are built.
 */
import { projectHandlers } from './projects'

export const handlers = [
  ...projectHandlers,
]
