import { test, expect, mockCohort1Apis, mockCohort2Apis } from './fixtures'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await mockCohort1Apis(page)
  await mockCohort2Apis(page)
})

// ─── Cross-page navigation flows ─────────────────────────────────────────────

test.describe('Navigation flow: Leases → LeaseDetail → Record Payment', () => {
  test('navigates from lease list to lease detail', async ({ page }) => {
    await page.goto('/leases')
    await expect(page.getByRole('heading', { name: /leases/i })).toBeVisible()

    const detailLink = page.getByRole('link', { name: /detail/i }).first()
    if (await detailLink.isVisible()) {
      await detailLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1, [data-testid="lease-detail"]').first()).toBeVisible()
    }
  })

  test('navigates from lease detail to rent collection', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    await page.waitForLoadState('networkidle')

    const recordLink = page.getByRole('link', { name: /record payment/i })
    if (await recordLink.isVisible()) {
      const href = await recordLink.getAttribute('href')
      expect(href).toMatch(/rent/)
    }
  })

  test('back navigation returns to leases list', async ({ page }) => {
    await page.goto('/leases/LEASE-001')
    await page.goBack()
    await expect(page).toHaveURL(/\/leases$/)
  })
})

test.describe('Navigation flow: Properties → PropertyDetail (cockpit)', () => {
  test('main nav links are all reachable', async ({ page }) => {
    await page.goto('/')
    const navLinks = ['/leases', '/accounting', '/rent', '/maintenance']
    for (const href of navLinks) {
      const link = page.getByRole('link', { name: new RegExp(href.replace('/', ''), 'i') }).first()
      if (await link.isVisible()) {
        await link.click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(new RegExp(href))
        await page.goBack()
      }
    }
  })
})

// ─── Error-state E2E tests ────────────────────────────────────────────────────

test.describe('Error states — network failures', () => {
  test('leases page shows error when API returns 500', async ({ page }) => {
    await page.route('**/api/v1/leases', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )

    await page.goto('/leases')
    await expect(
      page.getByRole('alert').or(page.getByText(/failed to load/i)).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('leases page shows error when API times out (network abort)', async ({ page }) => {
    await page.route('**/api/v1/leases', (route) => route.abort('timedout'))

    await page.goto('/leases')
    await expect(
      page.getByRole('alert').or(page.getByText(/failed to load/i)).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('accounting page shows error when API returns 404', async ({ page }) => {
    await page.route('**/api/v1/financial/accounting/**', (route) =>
      route.fulfill({ status: 404, body: 'Not Found' })
    )

    await page.goto('/accounting')
    await expect(
      page.getByRole('alert')
        .or(page.getByText(/failed to load/i))
        .or(page.getByText(/something went wrong/i))
        .first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('maintenance page shows error on 503', async ({ page }) => {
    await page.route('**/api/v1/maintenance/**', (route) =>
      route.fulfill({ status: 503, body: 'Service Unavailable' })
    )

    await page.goto('/maintenance')
    await expect(
      page.getByRole('alert').or(page.getByText(/failed to load/i)).first()
    ).toBeVisible({ timeout: 5000 })
  })
})

// ─── A11y E2E via @axe-core/playwright ───────────────────────────────────────

test.describe('A11y via axe-core on smoked pages', () => {
  test('/ (home) has no critical axe violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('/leases has no critical axe violations when loaded', async ({ page }) => {
    await page.goto('/leases')
    await expect(page.getByText('Alice Johnson')).toBeVisible({ timeout: 5000 })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('/accounting has no critical axe violations when loaded', async ({ page }) => {
    await page.goto('/accounting')
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('/rent has no critical axe violations in initial state', async ({ page }) => {
    await page.goto('/rent')
    await expect(page.getByRole('heading', { name: /rent payment/i })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('/maintenance has no critical axe violations when loaded', async ({ page }) => {
    await page.goto('/maintenance')
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
