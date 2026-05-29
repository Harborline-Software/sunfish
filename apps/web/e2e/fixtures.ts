import { test as base, type Page, type Route } from '@playwright/test'

export type ApiMocks = {
  properties?: object
  leases?: object
  workOrders?: object
}

export const MOCK_PROPERTIES = {
  properties: [
    {
      propertyId: 'PROP-0001',
      displayName: '150 Lexington Ct',
      kind: 'MultiUnit',
      addressLine1: '150 Lexington Ct',
      city: 'Seattle',
      region: 'WA',
      unitCount: 4,
      status: 'Active',
      entityTag: 'etag-001',
    },
    {
      propertyId: 'PROP-0002',
      displayName: '200 Main St',
      kind: 'SingleFamily',
      addressLine1: '200 Main St',
      city: 'Bellevue',
      region: 'WA',
      unitCount: 1,
      status: 'Active',
      entityTag: 'etag-002',
    },
  ],
}

export const MOCK_LEASES = {
  leases: [
    {
      leaseId: 'LEASE-001',
      tenantDisplayName: 'Alice Johnson',
      propertyId: 'PROP-0001',
      propertyDisplayName: '150 Lexington Ct',
      unitId: 'Unit 2',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      monthlyRent: 1850,
      status: 'Active',
    },
    {
      leaseId: 'LEASE-002',
      tenantDisplayName: 'Bob Chen',
      propertyId: 'PROP-0002',
      propertyDisplayName: '200 Main St',
      unitId: null,
      startDate: '2023-06-01',
      endDate: '2024-05-31',
      monthlyRent: 2400,
      status: 'Expired',
    },
  ],
}

export const MOCK_LEASE_DETAIL = {
  leaseId: 'LEASE-001',
  tenantDisplayName: 'Alice Johnson',
  propertyId: 'PROP-0001',
  propertyDisplayName: '150 Lexington Ct',
  unitId: 'Unit 2',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  monthlyRent: 1850,
  status: 'Active',
  securityDeposit: 1850,
  leaseTerm: '12 months',
  tenants: [{ partyId: 'PARTY-001', displayName: 'Alice Johnson' }],
  notes: null,
}

export const MOCK_WORK_ORDERS = {
  items: [
    {
      workOrderId: 'WO-0001',
      status: 'Scheduled',
      vendorId: 'VENDOR-001',
      scheduledDate: '2024-06-15',
      completedDate: null,
      appointmentDate: '2024-06-15',
    },
    {
      workOrderId: 'WO-0002',
      status: 'Completed',
      vendorId: 'VENDOR-002',
      scheduledDate: '2024-05-01',
      completedDate: '2024-05-02',
      appointmentDate: null,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 25,
}

export async function mockCohort1Apis(page: Page, overrides: ApiMocks = {}) {
  await page.route('**/api/v1/properties', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides.properties ?? MOCK_PROPERTIES),
    }),
  )

  await page.route('**/api/v1/leases', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides.leases ?? MOCK_LEASES),
    }),
  )

  await page.route('**/api/v1/leases/LEASE-001', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LEASE_DETAIL),
    }),
  )

  await page.route('**/api/v1/cockpit/work-orders**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides.workOrders ?? MOCK_WORK_ORDERS),
    }),
  )

  // Whoami — simulates authenticated session
  await page.route('**/api/v1/whoami', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: 'e2e-test',
        role: 'owner',
        defaultCompany: 'e2e-co',
        availableCompanies: ['e2e-co'],
      }),
    }),
  )
}

export const test = base
export { expect } from '@playwright/test'
