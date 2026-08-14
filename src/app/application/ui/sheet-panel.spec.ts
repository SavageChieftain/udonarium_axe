import { sheetPanelBox, sheetPanelTitle } from '@axe/application/ui/sheet-panel';

describe('sheetPanelTitle()', () => {
  it('名前があれば見出しに添えること', () => {
    expect(sheetPanelTitle('キャラクターシート', 'アリス')).toBe('キャラクターシート - アリス');
  });

  it('名前が無ければ見出しだけにすること', () => {
    expect(sheetPanelTitle('キャラクターシート', '')).toBe('キャラクターシート');
  });
});

describe('sheetPanelBox()', () => {
  it('つまんだところを中心に開くこと', () => {
    expect(sheetPanelBox({ x: 500, y: 400 }, 600, 300)).toEqual({ left: 200, top: 250, width: 600, height: 300 });
  });

  it('大きさが変わっても中心を保つこと', () => {
    // 幅と高さだけ書き換えて座標を直し忘れると、窓が指した物からずれて開く。
    const small = sheetPanelBox({ x: 0, y: 0 }, 400, 380);
    expect(small.left + small.width / 2).toBe(0);
    expect(small.top + small.height / 2).toBe(0);
  });
});
