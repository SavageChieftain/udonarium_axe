import { VisualNovelSettingsService } from '@axe/features/visual-novel/visual-novel-settings.service';

describe('VisualNovelSettingsService', () => {
  beforeEach(() => {
    localStorage.removeItem('vn-settings');
  });

  afterEach(() => {
    localStorage.removeItem('vn-settings');
  });

  it('starts plain, and slides', () => {
    const service = new VisualNovelSettingsService();
    expect(service.typewriterSpeed()).toBe('normal');
    expect(service.portraitAnimation()).toBe('slide');
  });

  it('starts with nothing over the backdrop', () => {
    const service = new VisualNovelSettingsService();
    expect(service.readability()).toBe(0);
  });

  it('keeps the legibility that was chosen', () => {
    new VisualNovelSettingsService().setReadability(2);
    expect(new VisualNovelSettingsService().readability()).toBe(2);
  });

  it('falls back to nothing over it for a setting it does not know', () => {
    localStorage.setItem('vn-settings', JSON.stringify({ readability: 'つよい' }));
    expect(new VisualNovelSettingsService().readability()).toBe(0);
  });

  it('saves a change and hands it to the next instance', () => {
    const service = new VisualNovelSettingsService();
    service.setTypewriterSpeed('fast');
    service.setPortraitAnimation('bounce');

    const reloaded = new VisualNovelSettingsService();
    expect(reloaded.typewriterSpeed()).toBe('fast');
    expect(reloaded.portraitAnimation()).toBe('bounce');
  });

  it('falls back to the default for a saved value it cannot read', () => {
    localStorage.setItem('vn-settings', JSON.stringify({ typewriterSpeed: 'warp', portraitAnimation: 42 }));
    const service = new VisualNovelSettingsService();
    expect(service.typewriterSpeed()).toBe('normal');
    expect(service.portraitAnimation()).toBe('slide');
  });

  it('saves the playback speed and keeps it in range', () => {
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

  it('starts on the defaults when what was saved is broken', () => {
    localStorage.setItem('vn-settings', '{broken');
    const service = new VisualNovelSettingsService();
    expect(service.typewriterSpeed()).toBe('normal');
  });
});
