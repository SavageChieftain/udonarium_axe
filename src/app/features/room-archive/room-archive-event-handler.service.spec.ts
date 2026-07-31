import { TestBed } from '@angular/core/testing';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { EventChannel } from '@axe/core/event/event-channel';
import { RoomArchiveEventHandlerService } from '@axe/features/room-archive/room-archive-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

type StoreEvent = { identifier: string; aliasName: string };

describe('RoomArchiveEventHandlerService', () => {
  let objectChanged$: EventChannel<StoreEvent>;
  let objectAdded$: EventChannel<StoreEvent>;
  let objectRemoved$: EventChannel<StoreEvent>;

  let capture: ReturnType<typeof vi.fn>;
  let canEditTabletop: boolean;
  let isRestoring: boolean;

  function setup(): RoomArchiveEventHandlerService {
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: ObjectChangeService, useValue: { objectChanged$, objectAdded$, objectRemoved$ } },
        {
          provide: RolePermissionService,
          useValue: {
            get canEditTabletop() {
              return canEditTabletop;
            },
          },
        },
        { provide: RoomSnapshotService, useValue: { isSupported: true, isRestoring: () => isRestoring, capture } },
        RoomArchiveEventHandlerService,
      ],
    });
    return TestBed.inject(RoomArchiveEventHandlerService);
  }

  function emitChange(): void {
    objectChanged$.emit({ identifier: 'obj', aliasName: 'character' });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    objectChanged$ = new EventChannel<StoreEvent>();
    objectAdded$ = new EventChannel<StoreEvent>();
    objectRemoved$ = new EventChannel<StoreEvent>();
    capture = vi.fn().mockResolvedValue(null);
    canEditTabletop = true;
    isRestoring = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('変更が止んでから自動保存する', async () => {
    setup();
    emitChange();

    await vi.advanceTimersByTimeAsync(19_000);
    expect(capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2_000);
    expect(capture).toHaveBeenCalledOnce();
  });

  it('変更が続く間はデバウンスされ、保存は 1 回にまとまる', async () => {
    setup();
    for (let i = 0; i < 5; i++) {
      emitChange();
      await vi.advanceTimersByTimeAsync(10_000);
    }
    expect(capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(capture).toHaveBeenCalledOnce();
  });

  it('変更が続いても上限時間で必ず保存する', async () => {
    setup();
    for (let i = 0; i < 30; i++) {
      emitChange();
      await vi.advanceTimersByTimeAsync(10_000);
    }
    expect(capture).toHaveBeenCalled();
  });

  it('編集権限がなければ保存しない', async () => {
    canEditTabletop = false;
    setup();
    emitChange();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(capture).not.toHaveBeenCalled();
  });

  it('復元中は保存を先送りする', async () => {
    setup();
    isRestoring = true;
    emitChange();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(capture).not.toHaveBeenCalled();

    isRestoring = false;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(capture).toHaveBeenCalledOnce();
  });

  it('変更がなければ保存しない', async () => {
    const service = setup();

    await service.flush();
    expect(capture).not.toHaveBeenCalled();
  });

  it('オブジェクトの追加・削除でも保存する', async () => {
    setup();
    objectAdded$.emit({ identifier: 'obj', aliasName: 'character' });
    await vi.advanceTimersByTimeAsync(21_000);
    expect(capture).toHaveBeenCalledOnce();

    objectRemoved$.emit({ identifier: 'obj', aliasName: 'character' });
    await vi.advanceTimersByTimeAsync(21_000);
    expect(capture).toHaveBeenCalledTimes(2);
  });
});
