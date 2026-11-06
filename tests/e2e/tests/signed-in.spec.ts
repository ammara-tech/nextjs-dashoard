import { expect, test, type Page } from '@playwright/test';

// These run only when the demo accounts are provided as environment variables
// (GitHub secrets in CI). Passwords are never kept in the repository.
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const patient = { email: process.env.E2E_PATIENT_EMAIL, password: process.env.E2E_PATIENT_PASSWORD };

async function signIn(page: Page, who: { email?: string; password?: string }) {
  await page.goto('/clinic-login');
  await page.fill('#email', who.email!);
  await page.fill('#password', who.password!);
  await page.getByRole('button', { name: /log in/i }).click();
}

test.describe('admin', () => {
  test.skip(!admin.email || !admin.password, 'E2E_ADMIN_* not set');

  test('sign in, see the two charts, browse, sign out', async ({ page }) => {
    await signIn(page, admin);
    await expect(page).toHaveURL(/\/medi-clinic/);
    await expect(page.getByText('Is the practice growing? New patients per month')).toBeVisible();
    await expect(page.getByText(/what share of this month.s appointments are no-shows/i)).toBeVisible();

    for (const path of ['patients', 'appointments', 'calendar', 'claims', 'members', 'shifts']) {
      const response = await page.goto(`/medi-clinic/${path}`);
      expect(response?.status(), path).toBeLessThan(400);
      await expect(page.locator('main')).toBeVisible();
    }

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto('/medi-clinic');
    await expect(page).toHaveURL(/login/);
  });

  test('appointment form offers a patient dropdown', async ({ page }) => {
    await signIn(page, admin);
    await page.goto('/medi-clinic/appointments');
    await expect(page.locator('select[name="patient_id"]').first()).toBeVisible();
  });

  test('CSV export downloads with a header row', async ({ page }) => {
    await signIn(page, admin);
    const response = await page.request.get('/medi-clinic/export/payments');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toContain('attachment');
  });
});

test.describe('patient', () => {
  test.skip(!patient.email || !patient.password, 'E2E_PATIENT_* not set');

  test('lands on their portal and cannot open staff pages', async ({ page }) => {
    await signIn(page, patient);
    await expect(page).toHaveURL(/portal|medical-aid|medi-clinic/);
    await page.goto('/medi-clinic/members');
    await expect(page).not.toHaveURL(/\/medi-clinic\/members$/);
    const exportResponse = await page.request.get('/medi-clinic/export/members', { maxRedirects: 0 });
    expect(exportResponse.status()).not.toBe(200);
  });

  test('can open the profile editor', async ({ page }) => {
    await signIn(page, patient);
    await page.goto('/medi-clinic/portal?tab=profile');
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });
});
