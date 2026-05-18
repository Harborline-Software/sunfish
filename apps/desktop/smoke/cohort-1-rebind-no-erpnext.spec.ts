import { test, expect } from './fixtures'

/**
 * Cohort 1 rebind smoke test.
 *
 * Asserts that the four Cohort 1 pages (Properties, Leases, LeaseDetail,
 * Maintenance) render using Bridge cluster endpoints with NO requests to
 * /api/v1/erpnext/* — i.e. ERPNext is no longer the runtime data plane
 * for these pages after W#74 Cohort 1.
 *
 * All Bridge endpoints are intercepted via page.route() so this test runs
 * without a live Bridge or ERPNext instance. Requests to /api/v1/erpnext/*
 * are trapped and cause the test to fail fast.
 *
 * Known allowlist exception:
 *   - LeaseDetailPage's usePayments() still calls /api/v1/erpnext/payments
 *     (Cohort 2 RB-8 deferred item). That specific call is allowlisted below.
 */

const SEED = {
  propertyId: 'prop-smoke-01',
  leaseId: 'lease-smoke-01',
  vendorId: 'vendor-smoke-01',
  workOrderId: 'wo-smoke-01',
}

test.describe('Cohort 1 rebind — no ERPNext calls', () => {
  test.beforeEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })

    // Stub Bridge cluster endpoints with minimal seed data.
    await page.route('**/api/v1/properties**', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              propertyId: SEED.propertyId,
              displayName: 'Smoke Test Property',
              address: '1 Test St',
              city: 'Testville',
              state: 'WA',
              postalCode: '98000',
              unitCount: 1,
              status: 'Active',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      }),
    )

    await page.route('**/api/v1/leases**', (r) => {
      const url = r.request().url()
      if (url.includes(`/${SEED.leaseId}`)) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            leaseId: SEED.leaseId,
            tenantDisplayName: 'Smoke Tenant',
            propertyDisplayName: 'Smoke Test Property',
            propertyId: SEED.propertyId,
            unitId: 'unit-1',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            monthlyRent: 1500,
            status: 'Active',
          }),
        })
      }
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              leaseId: SEED.leaseId,
              tenantDisplayName: 'Smoke Tenant',
              propertyDisplayName: 'Smoke Test Property',
              propertyId: SEED.propertyId,
              unitId: 'unit-1',
              startDate: '2025-01-01',
              endDate: '2025-12-31',
              monthlyRent: 1500,
              status: 'Active',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      })
    })

    await page.route('**/api/v1/cockpit/work-orders**', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              workOrderId: SEED.workOrderId,
              status: 'Draft',
              vendorId: SEED.vendorId,
              scheduledDate: '2099-06-01',
              completedDate: null,
              appointmentDate: null,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      }),
    )

    await page.route('**/api/v1/cockpit/vendors**', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ vendorId: SEED.vendorId, displayName: 'Smoke Plumbing Co.' }],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      }),
    )

    // Stub whoami so the app considers itself connected.
    await page.route('**/api/v1/whoami', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: 'smoke', role: 'owner', defaultCompany: 'smoke-co' }),
      }),
    )

    // Allowlist: LeaseDetailPage usePayments() still calls erpnext/payments
    // (Cohort 2 RB-8 deferred). Return empty so the page doesn't error.
    await page.route('**/api/v1/erpnext/payments**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )
  })

  test('PropertiesPage renders without ERPNext calls', async ({ page }) => {
    const erpnextCalls: string[] = []
    await page.route('**/api/v1/erpnext/**', (r) => {
      const url = r.request().url()
      if (!url.includes('/erpnext/payments')) erpnextCalls.push(url)
      return r.fallback()
    })

    await page.getByRole('link', { name: 'Properties' }).click()
    await expect(page.getByText('Smoke Test Property')).toBeVisible({ timeout: 10_000 })
    expect(erpnextCalls).toHaveLength(0)
  })

  test('LeasesPage renders without ERPNext calls', async ({ page }) => {
    const erpnextCalls: string[] = []
    await page.route('**/api/v1/erpnext/**', (r) => {
      const url = r.request().url()
      if (!url.includes('/erpnext/payments')) erpnextCalls.push(url)
      return r.fallback()
    })

    await page.getByRole('link', { name: 'Leases' }).click()
    await expect(page.getByText('Smoke Tenant')).toBeVisible({ timeout: 10_000 })
    expect(erpnextCalls).toHaveLength(0)
  })

  test('LeaseDetailPage renders without non-payments ERPNext calls', async ({ page }) => {
    const nonPaymentsErpnextCalls: string[] = []
    await page.route('**/api/v1/erpnext/**', (r) => {
      const url = r.request().url()
      if (!url.includes('/erpnext/payments')) nonPaymentsErpnextCalls.push(url)
      return r.fallback()
    })

    await page.getByRole('link', { name: 'Leases' }).click()
    await page.getByText('Smoke Tenant').click()
    await expect(page.getByText('Smoke Test Property')).toBeVisible({ timeout: 10_000 })
    // Payments ERPNext call is the ONLY allowed erpnext call on this page.
    expect(nonPaymentsErpnextCalls).toHaveLength(0)
  })

  test('MaintenancePage renders without ERPNext calls', async ({ page }) => {
    const erpnextCalls: string[] = []
    await page.route('**/api/v1/erpnext/**', (r) => {
      const url = r.request().url()
      if (!url.includes('/erpnext/payments')) erpnextCalls.push(url)
      return r.fallback()
    })

    await page.getByRole('link', { name: 'Maintenance' }).click()
    await expect(page.getByText('Smoke Plumbing Co.')).toBeVisible({ timeout: 10_000 })
    expect(erpnextCalls).toHaveLength(0)
  })
})
