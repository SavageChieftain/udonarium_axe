import { expect, Page } from '@playwright/test';

import { waitAppReady } from '../helpers';

export async function prepare(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'light');
    localStorage.setItem('ui-motion', 'on');
    localStorage.setItem('ui-widgets', JSON.stringify({}));
    localStorage.removeItem('ui-widget-layout');
  });
  await waitAppReady(page);
}

export async function becomeGm(page: Page) {
  const connection = page.locator('ui-panel').filter({ hasText: '接続情報' });
  await connection.getByRole('button', { name: /^\s*GM\s*$/ }).click();
  await expect(page.locator('app-gm-toolbar button').first()).toBeVisible({ timeout: 10000 });
}

export async function closePanels(page: Page) {
  const panels = page.locator('ui-panel');
  for (let round = 0; round < 8 && (await panels.count()) > 0; round++) {
    await panels.first().locator('.bg-ui-titlebar button', { hasText: 'close' }).dispatchEvent('click');
  }
  await expect(panels).toHaveCount(0);
}

export async function freezeAt(page: Page, ms: number) {
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await page.clock.runFor(ms);
}

export async function holdAnimationsAt(page: Page, ms: number) {
  await page.evaluate((at) => {
    for (const animation of document.getAnimations()) {
      const endTime = animation.effect?.getComputedTiming().endTime;
      if (typeof endTime === 'number' && Number.isFinite(endTime)) {
        animation.finish();
        continue;
      }
      animation.pause();
      animation.currentTime = at;
    }
  }, ms);
}

export interface SnapOptions {
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
  threshold?: number;
  animationAt?: number;
}

export async function snap(page: Page, name: string, options: SnapOptions = {}) {
  await page.evaluate(() => document.fonts.ready);
  await holdAnimationsAt(page, options.animationAt ?? 0);
  const { animationAt: _at, ...compare } = options;
  await expect(page).toHaveScreenshot(`${name}.png`, { maxDiffPixels: 4, ...compare });
}
