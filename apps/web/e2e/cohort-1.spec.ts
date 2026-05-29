import { test, expect, mockCohort1Apis, MOCK_PROPERTIES, MOCK_LEASES } from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockCohort1Apis(page)
})

// ─── PropertiesPage ──────────────────────────────────────────────────────────

test.describe('PropertiesPage (/properties)', () => {
  test('renders property cards for each result', async ({ page }) => {
    await page.goto('/properties')
    await expect(page.getByRole('heading', { name: 'Properties', level: 1 })).toBeVisible()
    await expect(page.getByText('150 Lexington Ct')).toBeVisible()
    await expect(page.getByText('200 Main St')).toBeVisible()
  })

  test('shows Active status badge on active properties', async ({ page }) => {
    await page.goto('/properties')
    // At least one Active badge visible
    await expect(page.getByText('Active').first()).toBeVisible()
  })

  test('shows unit count for multi-unit properties', async ({ page }) => {
    await page.goto('/properties')
    await expect(page.getByText(/4\s*units?/i)).toBeVisible()
  })

  test('empty state when API returns no properties', async ({ page }) => {
    await page.route('**/api/v1/properties', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ properties: [] }),
      }),
    )
    await page.goto('/properties')
    await expect(page.getByText(/no properties/i)).toBeVisible()
  })

  test('error state on API failure', async ({ page }) => {
    await page.route('**/api/v1/properties', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    )
    await page.goto('/properties')
    await expect(page.getByText(/failed to load properties/i)).toBeVisible()
  })
})

// ─── LeasesPage ──────────────────────────────────────────────────────────────

test.describe('LeasesPage (/leases)', () => {
  test('renders lease rows for each result', async ({ page }) => {
    await page.goto('/leases')
    await expect(page.getByRole('heading', { name: 'Leases', level: 1 })).toBeVisible()
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText('Bob Chen')).toBeVisible()
  })

  test('shows monthly rent for each lease', async ({ page }) => {
    await page.goto('/leases')
    await expect(page.getByText(/\$1,850/)).toBeVisible()
    await expect(page.getByText(/\$2,400/)).toBeVisible()
  })

  test('shows Active / Expired status badges', async ({ page }) => {
    await page.goto('/leases')
    await expect(page.getByText('Active')).toBeVisible()
    await expect(page.getByText('Expired')).toBeVisible()
  })

  test('navigates to LeaseDetailPage on row click', async ({ page }) => {
    await page.goto('/leases')
    await page.getByRole('link', { name: /Alice Johnson/ }).click()
    await expect(page).toHaveURL(/\/leases\/LEASE-001/)
    await expect(page.getByText('Alice Johnson')).toBeVisible()
  })

  test('empty state when API returns no leases', async ({ page }) => {
    await page.route('**/api/v1/leases', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leases: [] }),
      }),
    )
    await page.goto('/leases')
    await expect(page.getByText(/no leases/i)).toBeVisible()
  })
})

// ─── LeaseDetailPage ─────────────────────────────────────────────────────────

test.describe('LeaseDetailPage (/leases/:id)', () => {
  test('renders lease details', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText(/\$1,850/)).toBeVisible()
    await expect(page.getByText('150 Lexington Ct')).toBeVisible()
  })

  test('shows security deposit', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    await expect(page.getByText(/\$1,850/)).toBeVisible()
  })

  test('404 on non-existent lease', async ({ page }) => {
    await page.route('**/api/v1/leases/LEASE-DOES-NOT-EXIST', (route) =>
      route.fulfill({ status: 404, body: 'Not found' }),
    )
    await page.goto('/leases/LEASE-DOES-NOT-EXIST')
    await expect(page.getByText(/not found/i)).toBeVisible()
  })

  test('tenant isolation: does not reveal cross-tenant error details', async ({ page }) => {
    await page.route('**/api/v1/leases/LEASE-001', (route) =>
      route.fulfill({ status: 403, body: '{}' }),
    )
    await page.goto('/leases/LEASE-001')
    // E3 diagnostic-non-leak invariant: error must NOT reveal tenant context
    await expect(page.getByText(/another tenant/i)).not.toBeVisible()
    await expect(page.getByText(/different organization/i)).not.toBeVisible()
  })
})

// ─── MaintenancePage ─────────────────────────────────────────────────────────

test.describe('MaintenancePage (/maintenance)', () => {
  test('renders work order list', async ({ page }) => {
    await page.goto('/maintenance')
    await expect(page.getByRole('heading', { name: /Maintenance/i, level: 1 })).toBeVisible()
    await expect(page.getByText('WO-0001')).toBeVisible()
    await expect(page.getByText('WO-0002')).toBeVisible()
  })

  test('shows Scheduled and Completed statuses', async ({ page }) => {
    await page.goto('/maintenance')
    await expect(page.getByText('Scheduled')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
  })

  test('empty state when API returns no work orders', async ({ page }) => {
    await page.route('**/api/v1/cockpit/work-orders**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }),
      }),
    )
    await page.goto('/maintenance')
    await expect(page.getByText(/no work orders/i)).toBeVisible()
  })

  test('error state on API failure', async ({ page }) => {
    await page.route('**/api/v1/cockpit/work-orders**', (route) =>
      route.fulfill({ status: 503, body: 'Service unavailable' }),
    )
    await page.goto('/maintenance')
    await expect(page.getByText(/failed to load/i)).toBeVisible()
  })
})

// ─── Navigation smoke ────────────────────────────────────────────────────────

test.describe('Navigation — cohort-1 routes', () => {
  test('nav links reach all three cohort-1 pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Properties' })).toBeVisible()
    await page.getByRole('link', { name: 'Properties' }).click()
    await expect(page).toHaveURL(/\/properties/)

    await page.getByRole('link', { name: 'Leases' }).click()
    await expect(page).toHaveURL(/\/leases/)

    await page.getByRole('link', { name: /Maintenance/i }).click()
    await expect(page).toHaveURL(/\/maintenance/)
  })
})
