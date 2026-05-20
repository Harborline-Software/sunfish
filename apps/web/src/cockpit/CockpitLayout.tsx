import { NavLink, Outlet } from 'react-router-dom'
import { useBooleanFlagValue } from '@openfeature/react-sdk'
import { FLAGS } from '@/lib/flags'

/**
 * W#29 Phase 1 — Owner cockpit shell layout.
 *
 * Renders the cockpit-scoped sidebar (Properties / Work Orders / Vendors /
 * Dashboard) and an Outlet for the active cockpit page. PR 1 ships only the
 * Properties link wired; the other entries route to a "coming soon" landing
 * until PR 2–5 attach their views.
 *
 * The cockpit lives at `/cockpit/*` in the React app. Server-side, the
 * matching `/api/v1/cockpit/*` endpoints are guarded by `CockpitPolicy`
 * (authenticated + role ∈ {owner, spouse}); the sidebar simply mirrors what
 * the current role can reach.
 */
export function CockpitLayout() {
  const dashboardEnabled = useBooleanFlagValue(FLAGS.cockpitDashboard, false)

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside aria-label="Cockpit" className="w-56 shrink-0 border-r border-border bg-muted px-3 py-4">
        <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cockpit
        </h2>
        <nav aria-label="Cockpit navigation" className="flex flex-col gap-1 text-sm">
          <CockpitNavLink to="/cockpit">Properties</CockpitNavLink>
          <CockpitNavLink to="/cockpit/work-orders">
            Work Orders
          </CockpitNavLink>
          <CockpitNavLink to="/cockpit/vendors">
            Vendors
          </CockpitNavLink>
          <CockpitNavLink to="/cockpit/projects">
            Projects
          </CockpitNavLink>
          <CockpitNavLink to="/cockpit/dashboard" disabled={!dashboardEnabled}>
            Dashboard
          </CockpitNavLink>
        </nav>
      </aside>
      <section className="flex-1 px-6 py-6">
        <Outlet />
      </section>
    </div>
  )
}

function CockpitNavLink({
  to,
  children,
  disabled = false,
}: {
  to: string
  children: React.ReactNode
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <span
        className="rounded px-3 py-2 text-muted-foreground"
        title="Coming in a later phase"
        role="link"
        aria-disabled="true"
      >
        {children}
      </span>
    )
  }
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        isActive
          ? 'rounded bg-background px-3 py-2 font-medium text-foreground shadow-sm'
          : 'rounded px-3 py-2 text-muted-foreground hover:bg-background hover:text-foreground'
      }
    >
      {children}
    </NavLink>
  )
}
