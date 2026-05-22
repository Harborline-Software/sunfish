import { InMemoryProvider } from '@openfeature/web-sdk'

/**
 * Flag catalog — add new flags here before using in components.
 * Each key is a string flag name; defaultVariant determines which variant is active by default.
 * Override in development via localStorage: sunfish:flag:<name> = "on" | "off"
 */
const flagDefaults: Record<string, boolean> = {
  'cockpit-dashboard': false,
  'comms-signalr': true,
  'reports-pl': true,
  'maintenance-timeline': true,
  'audit-trail': false,
}

function buildFlagConfig(): ConstructorParameters<typeof InMemoryProvider>[0] {
  const config: ConstructorParameters<typeof InMemoryProvider>[0] = {}

  for (const [key, defaultValue] of Object.entries(flagDefaults)) {
    const stored = localStorage.getItem(`sunfish:flag:${key}`)
    const resolved = stored === 'on' ? true : stored === 'off' ? false : defaultValue

    config[key] = {
      disabled: false,
      defaultVariant: resolved ? 'on' : 'off',
      variants: { on: true, off: false },
    }
  }

  return config
}

export function createFlagProvider(): InMemoryProvider {
  return new InMemoryProvider(buildFlagConfig())
}

export const FLAGS = Object.fromEntries(
  Object.keys(flagDefaults).map((k) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), k]),
) as {
  cockpitDashboard: 'cockpit-dashboard'
  commsSignalr: 'comms-signalr'
  reportsPl: 'reports-pl'
  maintenanceTimeline: 'maintenance-timeline'
  auditTrail: 'audit-trail'
}
