import { TestBed } from '@angular/core/testing';
import { HotbarStoreService } from '@axe/application/hotbar/hotbar-store.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Hotbar } from '@axe/domain/hotbar/hotbar';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('HotbarStoreService', () => {
  let store: ObjectStore;
  let service: HotbarStoreService;

  beforeEach(() => {
    localStorage.removeItem('ui-hotbar-owner');
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    store = ObjectStore.instance;
    service = TestBed.inject(HotbarStoreService);
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    localStorage.removeItem('ui-hotbar-owner');
  });

  it('holds none until one is asked for', () => {
    expect(service.own()).toBeNull();
  });

  it('makes one and hands the same one back after', () => {
    const hotbar = service.ensureOwn();

    expect(hotbar).toBeInstanceOf(Hotbar);
    expect(hotbar?.ownerUserId).toBe(service.ownerId);
    expect(service.ensureOwn()).toBe(hotbar);
    expect(service.own()).toBe(hotbar);
  });

  it('is the reader’s own bar, not one belonging to whoever else is in the room', () => {
    const mine = service.ensureOwn();
    const theirs = Hotbar.ensureForUser('someone-else');

    expect(mine).not.toBe(theirs);
    expect(service.own()).toBe(mine);
  });

  it('finds one saved under another identifier by who it belongs to', () => {
    const loaded = new Hotbar('from-an-older-save');
    loaded.ownerUserId = service.ownerId;
    loaded.initialize();

    expect(service.own()).toBe(loaded);
  });

  it('keeps the same name for the reader across a reload', () => {
    const first = service.ownerId;

    expect(localStorage.getItem('ui-hotbar-owner')).toBe(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it('is the name the domain works from, so a bar read from a file lands here', () => {
    expect(Hotbar.ownerId).toBe(service.ownerId);
    expect(Hotbar.ensureMine()).toBe(service.ensureOwn());
  });
});
