import { expect, test } from '@playwright/test';

test('track a parcel while the driver moves', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Track' }).click();
  await page.getByTestId('tracking-input').fill('TRK-1001');
  await page.getByTestId('follow-button').click();
  await expect(page.getByTestId('eta-card')).toContainText(/min/);
  await expect(page.getByTestId('connection-pill')).toHaveText('live');
  const first = await page.getByTestId('driver-position').innerText();
  await expect(page.getByTestId('driver-position')).not.toHaveText(first, { timeout: 15_000 });
  await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/track.png', fullPage: true });
});

test('search picks an address label', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Pick' }).click();
  await page.getByTestId('search').fill('louvre');
  await page.getByTestId('search-button').click();
  await expect(page.getByTestId('address-label')).toContainText(/Louvre/i);
  await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/pick.png', fullPage: true });
});

test('navigation shows the next instruction', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('navigate-button').click();
  await expect(page.getByTestId('nav-step')).not.toHaveText('Loading the leg…');
  await page
    .locator('[data-testid="map-canvas"]:visible .leaflet-tile-loaded')
    .first()
    .waitFor({ timeout: 10_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/screenshots/navigate.png', fullPage: true });
});

test('optimize changes the stop order', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('stop-list')).toContainText('Eiffel Tower');
  const before = await page.getByTestId('stop-list').innerText();
  await page.getByTestId('optimize-button').click();
  await expect(page.getByTestId('stop-list')).not.toHaveText(before);
  await expect(page.getByTestId('stop-list')).toContainText('Louvre Museum');
  await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/driver.png', fullPage: true });
});
