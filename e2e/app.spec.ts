import { test, expect } from '@playwright/test';

test('アプリが起動すること', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Udonarium/i);
});
