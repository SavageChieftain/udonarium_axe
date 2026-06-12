import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    ng?: { getComponent(element: Element): unknown };
  }
}

test.describe('暗闇（ステージ効果）', () => {
  test('暗闇を有効にするとマップ領域だけにオーバーレイが描画される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeAttached({ timeout: 30000 });
    await expect(page.locator('table-vision-overlay canvas')).toBeAttached({ timeout: 10000 });

    const readOverlay = () =>
      page.evaluate(() => {
        const canvas = document.querySelector('table-vision-overlay canvas') as HTMLCanvasElement | null;
        if (!canvas) return { w: 0, h: 0, painted: 0 };
        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas.width || !canvas.height) return { w: canvas.width, h: canvas.height, painted: 0 };
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let painted = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
        return { w: canvas.width, h: canvas.height, painted };
      });

    const before = await readOverlay();
    expect(before.painted).toBe(0);

    const toggled = await page.evaluate(() => {
      const ng = window.ng;
      const element = document.querySelector('game-table');
      if (!ng || !element) return false;
      const component = ng.getComponent(element) as {
        currentTable?: {
          width: number;
          height: number;
          gridSize: number;
          darknessEnabled: boolean;
          update?: () => void;
        };
      };
      const table = component?.currentTable;
      if (!table) return false;
      table.darknessEnabled = true;
      table.update?.();
      return true;
    });
    expect(toggled).toBe(true);

    await expect.poll(async () => (await readOverlay()).painted, { timeout: 5000 }).toBeGreaterThan(0);

    const after = await readOverlay();
    const tableArea = await page.evaluate(() => {
      const element = document.querySelector('game-table');
      const ng = window.ng;
      const component =
        element && ng
          ? (ng.getComponent(element) as { currentTable?: { width: number; height: number; gridSize: number } })
          : null;
      const table = component?.currentTable;
      return table ? { w: table.width * table.gridSize, h: table.height * table.gridSize } : { w: 0, h: 0 };
    });

    expect(after.w).toBe(tableArea.w);
    expect(after.h).toBe(tableArea.h);
  });
});
