import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { lazy, Suspense, useEffect } from 'react'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ErrorCard } from '@/components/ErrorCard'
import { CompanySwitcher } from '@/components/CompanySwitcher'
import { useCompanyStore } from '@/stores/companyStore'
import { useAuthStore } from '@/stores/authStore'

const PropertiesPage = lazy(() => import('@/pages/PropertiesPage').then(m => ({ default: m.PropertiesPage })))
const LeasesPage = lazy(() => import('@/pages/LeasesPage').then(m => ({ default: m.LeasesPage })))
const LeaseDetailPage = lazy(() => import('@/pages/LeaseDetailPage').then(m => ({ default: m.LeaseDetailPage })))
const RentCollectionPage = lazy(() => import('@/pages/RentCollectionPage').then(m => ({ default: m.RentCollectionPage })))
const AccountingPage = lazy(() => import('@/pages/AccountingPage').then(m => ({ default: m.AccountingPage })))
const CrewCommsPage = lazy(() => import('@/pages/CrewCommsPage').then(m => ({ default: m.CrewCommsPage })))
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })))
const RentRoll = lazy(() => import('@/pages/RentRoll').then(m => ({ default: m.RentRoll })))
const PLReport = lazy(() => import('@/pages/PLReport').then(m => ({ default: m.PLReport })))
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
})

function AppErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  useEffect(() => {
    fetch('/api/v1/telemetry/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {/* best-effort */})
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full">
        <ErrorCard
          variant="page"
          title="Something went wrong"
          message={error.message}
          onRetry={() => {
            queryClient.clear()
            resetErrorBoundary()
          }}
        />
      </div>
    </div>
  )
}

function AppLayout() {
  const setActiveCompany = useCompanyStore((s) => s.setActiveCompany)
  const setAvailableCompanies = useCompanyStore((s) => s.setAvailableCompanies)
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    fetch('/api/v1/whoami', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { user?: string; role?: string; defaultCompany?: string; availableCompanies?: string[] }) => {
        if (data.defaultCompany) setActiveCompany(data.defaultCompany)
        if (data.availableCompanies) setAvailableCompanies(data.availableCompanies)
        setAuth(data.user ?? 'dev-user', data.role ?? 'owner')
      })
      .catch(() => {
        setAuth('dev-user', 'owner')
      })
  }, [setActiveCompany, setAvailableCompanies, setAuth])

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
            <NavLink
              to="/reports/rent-roll"
              className={({ isActive }) =>
                isActive ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'
              }
            >
              Reports
            </NavLink>
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
          <CompanySwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
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
            <Route path="/reports" element={<Navigate to="/reports/rent-roll" replace />} />
            <Route path="/reports/rent-roll" element={<RentRoll />} />
            <Route path="/reports/profit-loss" element={<PLReport />} />
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
      </main>
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
