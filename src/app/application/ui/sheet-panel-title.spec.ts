import { sheetPanelTitle } from '@axe/application/ui/sheet-panel-title';

describe('sheetPanelTitle()', () => {
  it('名前があれば見出しに添えること', () => {
    expect(sheetPanelTitle('キャラクターシート', 'アリス')).toBe('キャラクターシート - アリス');
  });

  it('名前が無ければ見出しだけにすること', () => {
    expect(sheetPanelTitle('キャラクターシート', '')).toBe('キャラクターシート');
  });
});
