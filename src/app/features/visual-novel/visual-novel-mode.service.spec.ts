import { VisualNovelModeService } from '@axe/features/visual-novel/visual-novel-mode.service';

describe('VisualNovelModeService', () => {
  it('初期状態では非アクティブであること', () => {
    const service = new VisualNovelModeService();
    expect(service.active()).toBe(false);
  });

  it('activate() / deactivate() でアクティブ状態が切り替わること', () => {
    const service = new VisualNovelModeService();
    service.activate();
    expect(service.active()).toBe(true);
    service.deactivate();
    expect(service.active()).toBe(false);
  });

  it('toggle() でアクティブ状態が反転すること', () => {
    const service = new VisualNovelModeService();
    service.toggle();
    expect(service.active()).toBe(true);
    service.toggle();
    expect(service.active()).toBe(false);
  });
});
