import { VisualNovelSettingsService } from '@axe/features/visual-novel/visual-novel-settings.service';

describe('VisualNovelSettingsService', () => {
  beforeEach(() => {
    localStorage.removeItem('vn-settings');
  });

  afterEach(() => {
    localStorage.removeItem('vn-settings');
  });

  it('既定値が normal / slide であること', () => {
    const service = new VisualNovelSettingsService();
    expect(service.typewriterSpeed()).toBe('normal');
    expect(service.portraitAnimation()).toBe('slide');
  });

  it('背景に何もかけない状態で始まること', () => {
    const service = new VisualNovelSettingsService();
    expect(service.readability()).toBe(0);
  });

  it('選んだ読みやすさは引き継ぐこと', () => {
    new VisualNovelSettingsService().setReadability(2);
    expect(new VisualNovelSettingsService().readability()).toBe(2);
  });

  it('知らない読みやすさは何もかけない状態に倒すこと', () => {
    localStorage.setItem('vn-settings', JSON.stringify({ readability: 'つよい' }));
    expect(new VisualNovelSettingsService().readability()).toBe(0);
  });

  it('設定変更が永続化され、新しいインスタンスに引き継がれること', () => {
    const service = new VisualNovelSettingsService();
    service.setTypewriterSpeed('fast');
    service.setPortraitAnimation('bounce');

    const reloaded = new VisualNovelSettingsService();
    expect(reloaded.typewriterSpeed()).toBe('fast');
    expect(reloaded.portraitAnimation()).toBe('bounce');
  });

  it('不正な保存値は既定値にフォールバックすること', () => {
    localStorage.setItem('vn-settings', JSON.stringify({ typewriterSpeed: 'warp', portraitAnimation: 42 }));
    const service = new VisualNovelSettingsService();
    expect(service.typewriterSpeed()).toBe('normal');
    expect(service.portraitAnimation()).toBe('slide');
  });

  it('オートプレイ速度が永続化され範囲内に丸められること', () => {
    const service = new VisualNovelSettingsService();
    expect(service.autoPlaySpeed()).toBe(1);
    service.setAutoPlaySpeed(1.75);
    const reloaded = new VisualNovelSettingsService();
    expect(reloaded.autoPlaySpeed()).toBe(1.75);
    service.setAutoPlaySpeed(99);
    expect(service.autoPlaySpeed()).toBe(2);
    service.setAutoPlaySpeed(0);
    expect(service.autoPlaySpeed()).toBe(0.5);
  });

  it('壊れた JSON が保存されていても既定値で起動すること', () => {
    localStorage.setItem('vn-settings', '{broken');
    const service = new VisualNovelSettingsService();
    expect(service.typewriterSpeed()).toBe('normal');
  });
});
