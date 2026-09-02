import { TestBed } from '@angular/core/testing';
import { InventoryViewPreferenceService } from '@axe/application/ui/inventory-view-preference.service';

const STORAGE_KEY = 'ui-inventory-view';

describe('InventoryViewPreferenceService', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  function service(): InventoryViewPreferenceService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(InventoryViewPreferenceService);
  }

  it('starts on the full picture', () => {
    expect(service().mode()).toBe('rich');
  });

  it('remembers what was picked', () => {
    service().set('table');

    expect(service().mode()).toBe('table');
  });

  it('ignores a way of reading it has never heard of', () => {
    localStorage.setItem(STORAGE_KEY, 'minimal');

    expect(service().mode()).toBe('rich');
  });

  it('holds for the session where the browser refuses to write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('refused');
    });
    const preference = service();

    expect(() => preference.set('table')).not.toThrow();
    expect(preference.mode()).toBe('table');
    setItem.mockRestore();
  });
});
