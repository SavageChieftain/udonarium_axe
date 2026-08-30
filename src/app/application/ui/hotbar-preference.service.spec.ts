import { TestBed } from '@angular/core/testing';
import { HotbarPreferenceService } from '@axe/application/ui/hotbar-preference.service';
import { HOTBAR_PAGES } from '@axe/domain/hotbar/hotbar-size';

describe('HotbarPreferenceService', () => {
  const STORAGE_KEY = 'ui-hotbar';

  function service(): HotbarPreferenceService {
    TestBed.resetTestingModule();
    return TestBed.inject(HotbarPreferenceService);
  }

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('opens on the first page, whole and shown', () => {
    const preference = service();

    expect(preference.page()).toBe(0);
    expect(preference.pinned()).toBe(false);
    expect(preference.showsLabel()).toBe(true);
  });

  it('takes up where the last session left off', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ page: 2, pinned: true, showsLabel: false }));

    const preference = service();

    expect(preference.page()).toBe(2);
    expect(preference.pinned()).toBe(true);
    expect(preference.showsLabel()).toBe(false);
  });

  it('holds a page to the ones the bar has', () => {
    const preference = service();

    preference.gotoPage(HOTBAR_PAGES + 3);
    expect(preference.page()).toBe(HOTBAR_PAGES - 1);

    preference.gotoPage(-2);
    expect(preference.page()).toBe(0);

    preference.gotoPage(Number.NaN);
    expect(preference.page()).toBe(0);
  });

  it('comes round again when the pages run out', () => {
    const preference = service();

    preference.gotoPage(HOTBAR_PAGES - 1);
    preference.turnPage(1);
    expect(preference.page()).toBe(0);

    preference.turnPage(-1);
    expect(preference.page()).toBe(HOTBAR_PAGES - 1);
  });

  it('shrugs off what it cannot read', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect(service().page()).toBe(0);

    localStorage.setItem(STORAGE_KEY, '{"page":"third"}');
    expect(service().page()).toBe(0);
  });
});
