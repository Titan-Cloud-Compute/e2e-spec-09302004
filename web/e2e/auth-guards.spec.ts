/**
 * admin_only foundation: route guards. Hermetic — every /api/** call is mocked
 * and the session is seeded in localStorage (the key AuthService restores from).
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/**', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
}

async function seedUser(page: Page, role: 'USER' | 'ADMIN'): Promise<void> {
  const user = { id: role === 'ADMIN' ? '2' : '1', email: `${role.toLowerCase()}@example.com`, name: role, role };
  await page.addInitScript((u) => {
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('isAuthenticated', 'true');
  }, user);
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('signed-out visitor on a shell route is sent to login', async ({ page }) => {
  await page.goto('/#/dashboard');
  await expect(page).toHaveURL(/#\/login/, { timeout: 10_000 });
  await page.goto('/#/admin/users');
  await expect(page).toHaveURL(/#\/login/, { timeout: 10_000 });
  await expect(page.locator('app-admin')).toHaveCount(0);
});

test('USER on an admin route is sent to the dashboard', async ({ page }) => {
  await seedUser(page, 'USER');
  await page.goto('/#/admin/users');
  await expect(page).toHaveURL(/#\/dashboard/, { timeout: 10_000 });
  await expect(page.locator('app-admin')).toHaveCount(0);
});

test('ADMIN reaches the admin users page', async ({ page }) => {
  await seedUser(page, 'ADMIN');
  await page.goto('/#/admin/users');
  await expect(page).toHaveURL(/#\/admin\/users/, { timeout: 10_000 });
  await expect(page.locator('main.main-content [data-placeholder]').first()).toBeVisible();
});
