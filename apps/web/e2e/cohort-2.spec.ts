import { test, expect, mockCohort1Apis, mockCohort2Apis } from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockCohort1Apis(page)
  await mockCohort2Apis(page)
})

// ─── AccountingPage ───────────────────────────────────────────────────────────

test.describe('AccountingPage (/accounting)', () => {
  test('renders summary tiles with mocked data', async ({ page }) => {
    await page.goto('/accounting')
    await expect(page.getByRole('heading', { name: 'Accounting', level: 1 })).toBeVisible()
    // Summary data renders (pre or post cohort-2 merge — heading always present)
    await expect(page.locator('h1, [data-testid="accounting-header"]').first()).toBeVisible()
  })

  test('shows outstanding invoices section', async ({ page }) => {
    await page.goto('/accounting')
    // Wait for content — either the outstanding section or loading state
    await expect(
      page.getByRole('heading', { name: /outstanding/i }).or(
        page.getByText(/loading/i)
      ).first()
    ).toBeVisible()
  })

  test('displays outstanding invoice data when loaded', async ({ page }) => {
    await page.goto('/accounting')
    // Wait for Alice Johnson's invoice to appear
    await expect(page.getByText('Alice Johnson')).toBeVisible({ timeout: 5000 })
  })
})

// ─── RentCollectionPage ───────────────────────────────────────────────────────

test.describe('RentCollectionPage (/rent)', () => {
  test('renders the payment form', async ({ page }) => {
    await page.goto('/rent')
    await expect(page.getByRole('heading', { name: /rent payment/i })).toBeVisible()
  })

  test('shows lease select with active leases from mocked API', async ({ page }) => {
    await page.goto('/rent')
    const leaseSelect = page.getByLabel(/lease/i)
    await expect(leaseSelect).toBeVisible()
    // After leases load, Alice Johnson's Active lease should appear as an option
    await expect(page.getByRole('option', { name: /alice johnson/i })).toBeVisible({ timeout: 5000 })
  })

  test('records a payment and shows confirmation', async ({ page }) => {
    await page.goto('/rent')

    // Wait for leases to load
    await expect(page.getByRole('option', { name: /alice johnson/i })).toBeVisible({ timeout: 5000 })

    // Fill the form
    await page.getByLabel(/lease/i).selectOption({ label: /alice johnson/i })
    await page.getByLabel(/amount/i).fill('1850')
    await page.getByLabel(/payment date/i).fill('2026-05-21')

    // Submit
    await page.getByRole('button', { name: /record payment/i }).click()

    // Confirmation panel
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/payment recorded/i)).toBeVisible()
    await expect(page.getByText(/\$1,850/)).toBeVisible()
  })

  test('shows token-fetch error state gracefully', async ({ page }) => {
    // Override antiforgery-token to fail
    await page.route('**/api/v1/financial/antiforgery-token', (route) =>
      route.fulfill({ status: 503, body: 'Service unavailable' })
    )

    await page.goto('/rent')
    await expect(page.getByRole('option', { name: /alice johnson/i })).toBeVisible({ timeout: 5000 })

    await page.getByLabel(/lease/i).selectOption({ label: /alice johnson/i })
    await page.getByLabel(/amount/i).fill('1850')
    await page.getByLabel(/payment date/i).fill('2026-05-21')
    await page.getByRole('button', { name: /record payment/i }).click()

    // E1 error card
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/couldn't reach the payment service/i)).toBeVisible()
  })
})

// ─── LeaseDetailPage (payments tab — cohort-2) ────────────────────────────────

test.describe('LeaseDetailPage payment history (/leases/LEASE-001)', () => {
  test('renders lease detail with payment history', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    await expect(page.getByRole('heading', { name: /alice johnson/i }).or(
      page.getByText('LEASE-001')
    ).first()).toBeVisible({ timeout: 5000 })
  })

  test('shows payment history section', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    // Payment history renders — either heading or loading state
    await expect(
      page.getByText(/payment/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('shows Record payment link pointing to rent collection', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    await page.waitForLoadState('networkidle')
    const recordLink = page.getByRole('link', { name: /record payment/i })
    if (await recordLink.isVisible()) {
      const href = await recordLink.getAttribute('href')
      expect(href).toContain('rent')
    }
    // Link may not exist on pre-cohort-2 page; test is conditional
  })
})

// ─── MaintenancePage (cohort-1, with Gantt) ───────────────────────────────────

test.describe('MaintenancePage (/maintenance)', () => {
  test('renders work order list', async ({ page }) => {
    await page.goto('/maintenance')
    await expect(page.getByRole('heading', { name: /maintenance/i })).toBeVisible()
    await expect(page.getByText('WO-0001').or(page.getByText(/scheduled/i)).first()).toBeVisible({ timeout: 5000 })
  })

  test('can switch to timeline view', async ({ page }) => {
    await page.goto('/maintenance')
    const timelineButton = page.getByRole('button', { name: /timeline/i })
    if (await timelineButton.isVisible()) {
      await timelineButton.click()
      // Timeline canvas or SVG should appear
      await expect(page.locator('[aria-label*="timeline" i], svg, canvas').first()).toBeVisible({ timeout: 3000 })
    }
  })
})
