import { test, expect } from '@playwright/test';

test('home page renders and has Indonesian lang', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page).toHaveTitle(/.+/);
});

test('auth page is reachable', async ({ page }) => {
  const res = await page.goto('/auth');
  expect(res?.status()).toBeLessThan(500);
});