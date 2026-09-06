import { test, expect } from '@playwright/test';
import { login } from './helpers';

const CSV = `name,purchase price,purchase date
E2E Import Lamp,12.50,2026-01-05
E2E Import Radio,33.00,2026-01-06`;

test.describe('CSV import', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('imports inventory rows from a CSV file', async ({ page }) => {
    await page.goto('/imports');
    await page.selectOption('select', { label: 'Inventory' });
    await page.setInputFiles('input[type="file"]', {
      name: 'inventory.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV),
    });

    // A preview with column mapping appears
    await expect(page.locator('text=Column Mapping')).toBeVisible();

    await page.click('button:has-text("Import")');
    await expect(page.locator('text=2 rows imported')).toBeVisible();

    // Imported items appear in inventory
    await page.goto('/inventory');
    await page.fill('input[type="search"], input[placeholder*="Search"]', 'E2E Import Lamp');
    await expect(page.locator('text=E2E Import Lamp')).toBeVisible();
  });

  test('rejects an oversized CSV', async ({ page }) => {
    await page.goto('/imports');
    await page.setInputFiles('input[type="file"]', {
      name: 'huge.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc(2 * 1024 * 1024, 'a'),
    });
    await expect(page.locator('text=1MB limit')).toBeVisible();
  });
});