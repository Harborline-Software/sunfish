import { BrowserRouter, Routes, Route, Navigate, NavLink, useMatch } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { generateErrorId, reportError } from '@/lib/reportError'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import { CompanySwitcher } from '@/components/CompanySwitcher'
import { useCompanyStore } from '@/stores/companyStore'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { getAntiforgeryToken } from '@/api/auth'

const PropertiesPage = lazy(() => import('@/pages/PropertiesPage').then(m => ({ default: m.PropertiesPage })))
const LeasesPage = lazy(() => import('@/pages/LeasesPage').then(m => ({ default: m.LeasesPage })))
const LeaseDetailPage = lazy(() => import('@/pages/LeaseDetailPage').then(m => ({ default: m.LeaseDetailPage })))
const RentCollectionPage = lazy(() => import('@/pages/RentCollectionPage').then(m => ({ default: m.RentCollectionPage })))
const AccountingPage = lazy(() => import('@/pages/AccountingPage').then(m => ({ default: m.AccountingPage })))
const CrewCommsPage = lazy(() => import('@/pages/CrewCommsPage').then(m => ({ default: m.CrewCommsPage })))
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })))
const RentRollPage = lazy(() => import('@/pages/RentRollPage').then(m => ({ default: m.RentRollPage })))
const ProfitAndLossByPropertyPage = lazy(() => import('@/pages/ProfitAndLossByPropertyPage').then(m => ({ default: m.ProfitAndLossByPropertyPage })))
const TrialBalancePage = lazy(() => import('@/pages/TrialBalancePage').then(m => ({ default: m.TrialBalancePage })))
const ArAgingPage = lazy(() => import('@/pages/ArAgingPage').then(m => ({ default: m.ArAgingPage })))
const ApAgingPage = lazy(() => import('@/pages/ApAgingPage').then(m => ({ default: m.ApAgingPage })))
const CockpitLayout = lazy(() => import('@/cockpit/CockpitLayout').then(m => ({ default: m.CockpitLayout })))
const PropertySelector = lazy(() => import('@/cockpit/PropertySelector').then(m => ({ default: m.PropertySelector })))
const PropertyDetailView = lazy(() => import('@/cockpit/properties/PropertyDetailView').then(m => ({ default: m.PropertyDetailView })))
const WorkOrderListView = lazy(() => import('@/cockpit/work-orders/WorkOrderListView').then(m => ({ default: m.WorkOrderListView })))
const WorkOrderDetailView = lazy(() => import('@/cockpit/work-orders/WorkOrderDetailView').then(m => ({ default: m.WorkOrderDetailView })))
const VendorListView = lazy(() => import('@/cockpit/vendors/VendorListView').then(m => ({ default: m.VendorListView })))
const VendorDetailView = lazy(() => import('@/cockpit/vendors/VendorDetailView').then(m => ({ default: m.VendorDetailView })))
const DashboardView = lazy(() => import('@/cockpit/DashboardView').then(m => ({ default: m.DashboardView })))
const AuditEventsPage = lazy(() => import('@/pages/AuditEventsPage').then(m => ({ default: m.AuditEventsPage })))
const AuditEventDetailPage = lazy(() => import('@/pages/AuditEventDetailPage').then(m => ({ default: m.AuditEventDetailPage })))
// W#79 + ADR 0099 auth pages — outside AppLayout (no nav header for pre-auth flows)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then(m => ({ default: m.SignupPage })))
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })))
const VerifyEmailPendingPage = lazy(() => import('@/pages/auth/VerifyEmailPendingPage').then(m => ({ default: m.VerifyEmailPendingPage })))
const ResendVerificationPage = lazy(() => import('@/pages/auth/ResendVerificationPage').then(m => ({ default: m.ResendVerificationPage })))
const EmailVerifiedPage = lazy(() => import('@/pages/auth/EmailVerifiedPage').then(m => ({ default: m.EmailVerifiedPage })))
// Cohort-5 — property unit detail + vacancy admin
const VacanciesPage = lazy(() => import('@/pages/VacanciesPage').then(m => ({ default: m.VacanciesPage })))
const UnitDetailPage = lazy(() => import('@/pages/UnitDetailPage').then(m => ({ default: m.UnitDetailPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
})

function AppErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const errorId = useMemo(() => generateErrorId(), [error])

  useEffect(() => {
    reportError(error, errorId).catch(() => {})
  }, [error, errorId])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-red-700">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-600">{error.message}</p>
        <p className="mt-3 font-mono text-xs text-gray-400">Error ID: {errorId}</p>
        <button
          onClick={() => {
            queryClient.clear()
            resetErrorBoundary()
          }}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

const REPORT_LINKS = [
  { to: '/reports/trial-balance', label: 'Trial Balance' },
  { to: '/reports/ar-aging', label: 'AR Aging' },
  { to: '/reports/ap-aging', label: 'AP Aging' },
  { to: '/reports/profit-and-loss-by-property', label: 'P&L by Property' },
  { to: '/reports/rent-roll', label: 'Rent Roll' },
]

function ReportsNavGroup() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = Boolean(useMatch('/reports/*'))

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}
      >
        Reports
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {REPORT_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive: a }) =>
                `block px-4 py-2 text-sm ${a ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`
            }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function LogoutButton() {
  const logout = useLogout()
  return (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
    >
      Sign out
    </button>
  )
}

function AppLayout() {
  const setActiveCompany = useCompanyStore((s) => s.setActiveCompany)
  const setAvailableCompanies = useCompanyStore((s) => s.setAvailableCompanies)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setActiveTenantId = useCompanyStore((s) => s.setActiveTenantId)
  const loaded = useAuthStore((s) => s.loaded)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    fetch('/api/v1/whoami', { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) { setUnauthenticated(); return }
        return r.json().then((data: {
          user?: string
          role?: string
          defaultCompany?: string
          availableCompanies?: string[]
          tenantId?: string
        }) => {
          if (data.defaultCompany) setActiveCompany(data.defaultCompany)
          if (data.availableCompanies) setAvailableCompanies(data.availableCompanies)
          // Cohort-4 cycle 2 — store substrate tenantId for A1 defense-in-depth assertion.
          // Empty string means no tenant bound (dev-stub); assertion skips when empty.
          setActiveTenantId(data.tenantId ?? '')
          setAuth(data.user ?? 'dev-user', data.role ?? 'owner')
          // Fetch CSRF token for this authenticated session (needed for mutations after refresh).
          getAntiforgeryToken()
            .then(({ token }) => setCsrfToken(token))
            .catch(() => {})
        })
      })
      .catch(() => {
        // Network error — dev mode without backend; treat as dev user.
        setAuth('dev-user', 'owner')
      })
  }, [setActiveCompany, setAvailableCompanies, setActiveTenantId, setAuth, setUnauthenticated, setCsrfToken])

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="min-h-screen bg-white">
      <OfflineBanner />
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <nav className="flex items-center gap-6 text-sm">
            <span className="font-semibold text-gray-900">Sunfish</span>
            <NavLink
              to="/properties"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Properties
            </NavLink>
            <NavLink
              to="/vacancies"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Vacancies
            </NavLink>
            <NavLink
              to="/leases"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Leases
            </NavLink>
            <NavLink
              to="/rent"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Rent
            </NavLink>
            <NavLink
              to="/accounting"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Accounting
            </NavLink>
            <NavLink
              to="/comms"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Comms
            </NavLink>
            <NavLink
              to="/maintenance"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Maintenance
            </NavLink>
            <ReportsNavGroup />
            <NavLink
              to="/cockpit"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Cockpit
            </NavLink>
            <NavLink
              to="/audit-trail"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Audit
            </NavLink>
          </nav>
          <div className="flex items-center gap-4">
            <CompanySwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <RouteErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center h-48 text-gray-500">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/properties" replace />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/leases" element={<LeasesPage />} />
              <Route path="/leases/:name" element={<LeaseDetailPage />} />
              <Route path="/rent" element={<RentCollectionPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/comms" element={<CrewCommsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/reports" element={<Navigate to="/reports/trial-balance" replace />} />
              <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
              <Route path="/reports/ar-aging" element={<ArAgingPage />} />
              <Route path="/reports/ap-aging" element={<ApAgingPage />} />
              <Route path="/reports/profit-and-loss-by-property" element={<ProfitAndLossByPropertyPage />} />
              <Route path="/reports/rent-roll" element={<RentRollPage />} />
              <Route path="/reports/profit-loss" element={<Navigate to="/reports/profit-and-loss-by-property" replace />} />
              <Route path="/vacancies" element={<VacanciesPage />} />
              <Route path="/units/:unitId" element={<UnitDetailPage />} />
              <Route path="/audit-trail" element={<AuditEventsPage />} />
              <Route path="/audit-trail/:auditId" element={<AuditEventDetailPage />} />
              <Route path="/cockpit" element={<CockpitLayout />}>
                <Route index element={<PropertySelector />} />
                <Route path="work-orders" element={<WorkOrderListView />} />
                <Route path="work-orders/:workOrderId" element={<WorkOrderDetailView />} />
                <Route path="vendors" element={<VendorListView />} />
                <Route path="vendors/:vendorId" element={<VendorDetailView />} />
                <Route path=":propertyId/dashboard" element={<DashboardView />} />
                <Route path=":propertyId" element={<PropertyDetailView />} />
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              {/* Auth flows — no nav header */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/verify-email/pending" element={<VerifyEmailPendingPage />} />
              <Route path="/auth/resend-verification" element={<ResendVerificationPage />} />
              <Route path="/auth/verified" element={<EmailVerifiedPage />} />
              {/* Main app — with nav header */}
              <Route path="/*" element={<AppLayout />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
