import { test } from '@playwright/test';

import { closeModal, closePanels, freeze, openTableSetting, prepare, settle, snap } from './fixtures';

for (const [kind, name] of [
  ['雷雨', 'weather-storm'],
  ['雪', 'weather-snow'],
] as const) {
  test(`${name} looks the same at a fixed instant`, async ({ page }) => {
    await prepare(page);
    await closePanels(page);
    await freeze(page);
    await openTableSetting(page);
    await page.locator('modal select[name="tableWeatherKind"]').selectOption({ label: kind });
    await settle(page);
    await closeModal(page);
    await settle(page, 800);
    await snap(page, name);
  });
}
