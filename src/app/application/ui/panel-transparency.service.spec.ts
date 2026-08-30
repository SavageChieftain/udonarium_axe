import { TestBed } from '@angular/core/testing';
import { PanelTransparencyService } from '@axe/application/ui/panel-transparency.service';

describe('PanelTransparencyService', () => {
  const STORAGE_KEY = 'ui-panel-transparency';

  function service(): PanelTransparencyService {
    TestBed.resetTestingModule();
    return TestBed.inject(PanelTransparencyService);
  }

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('starts every kind of panel whole', () => {
    expect(service().valueOf('chat-window')).toBe(0);
  });

  it('holds each kind apart from the others', () => {
    const preference = service();

    preference.set('chat-window', 60);

    expect(preference.valueOf('chat-window')).toBe(60);
    expect(preference.valueOf('game-character-sheet')).toBe(0);
  });

  it('takes up where the last session left each kind', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'chat-window': 45, 'game-character-sheet': 20 }));

    const preference = service();

    expect(preference.valueOf('chat-window')).toBe(45);
    expect(preference.valueOf('game-character-sheet')).toBe(20);
  });

  it('holds what it is set to between the two ends of the bar', () => {
    const preference = service();

    preference.set('chat-window', -20);
    expect(preference.valueOf('chat-window')).toBe(0);

    preference.set('chat-window', 140);
    expect(preference.valueOf('chat-window')).toBe(100);

    preference.set('chat-window', Number.NaN);
    expect(preference.valueOf('chat-window')).toBe(100);
  });

  it('makes what it reads back fit the bar, and shrugs off what it cannot read', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'chat-window': 400, broken: 'nonsense' }));
    expect(service().valueOf('chat-window')).toBe(100);

    localStorage.setItem(STORAGE_KEY, 'not json at all');
    expect(service().valueOf('chat-window')).toBe(0);
  });
});
