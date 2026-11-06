import { expect, test } from '@playwright/test';

// These need no account: they prove the site is up and the dashboards are protected.

test('landing page shows the three dashboards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /open family clinic/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /open next\.js dashboard/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /open medical aid/i })).toBeVisible();
});

for (const path of [
  '/medi-clinic',
  '/medi-clinic/patients',
  '/medi-clinic/claims',
  '/medi-clinic/members',
  '/dashboard',
  '/medical-aid/dashboard',
]) {
  test(`signed out, ${path} sends you to a login page`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
}

test('CSV exports refuse signed-out requests', async ({ request }) => {
  for (const kind of ['payments', 'claims', 'members']) {
    const response = await request.get(`/medi-clinic/export/${kind}`, { maxRedirects: 0 });
    expect(response.status(), kind).not.toBe(200);
    expect(await response.text()).not.toContain('Reference');
  }
});

test('wrong password shows an error and stays on the login page', async ({ page }) => {
  await page.goto('/clinic-login');
  await page.fill('#email', 'nobody@example.com');
  await page.fill('#password', 'not-a-real-password');
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page.getByText(/invalid|incorrect|wrong|try again/i)).toBeVisible();
  await expect(page).toHaveURL(/clinic-login/);
});

test('an unknown page shows the branded 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
});

test('dark mode and language switch with the keyboard', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const before = await html.evaluate((el) => el.classList.contains('dark'));
  await page.keyboard.press('t');
  await expect
    .poll(() => html.evaluate((el) => el.classList.contains('dark')))
    .toBe(!before);
  await page.keyboard.press('l');
  await expect.poll(() => html.getAttribute('lang')).toBe('af');
});

test('the app is installable: manifest, icons, offline page and service worker', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  const body = await manifest.json();
  expect(body.name).toBeTruthy();
  expect(body.display).toBe('standalone');
  for (const icon of body.icons) {
    expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  }
  expect((await request.get('/offline.html')).status()).toBe(200);
  const worker = await request.get('/sw.js');
  expect(worker.status()).toBe(200);
  expect(await worker.text()).toContain('offline.html');
});

test('scheduled jobs refuse requests without the secret', async ({ request }) => {
  for (const path of ['/api/cron/reminders', '/api/cron/renewals']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
  const wrong = await request.get('/api/cron/reminders', { headers: { Authorization: 'Bearer wrong' } });
  expect(wrong.status()).toBe(401);
});

test('the audit log is staff only', async ({ page }) => {
  await page.goto('/medi-clinic/audit');
  await expect(page).toHaveURL(/login/);
});
