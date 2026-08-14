import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { Network } from '@axe/core/network/network';
import { IPeerContext } from '@axe/core/network/peer-context';
import { RoomSnapshotMeta } from '@axe/core/storage/room-snapshot-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { RoomRestoreBannerComponent } from '@axe/features/room-archive/room-restore-banner/room-restore-banner.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('RoomRestoreBannerComponent', () => {
  const snapshot: RoomSnapshotMeta = {
    id: 1,
    roomName: '',
    savedAt: new Date(2026, 6, 3, 9, 5).getTime(),
    byteSize: 2048,
  };

  let fixture: ComponentFixture<RoomRestoreBannerComponent>;
  let snapshots: ReturnType<typeof signal<readonly RoomSnapshotMeta[]>>;
  let restore: ReturnType<typeof vi.fn>;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RoomRestoreBannerComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: RoomSnapshotService,
          useValue: {
            snapshots: snapshots.asReadonly(),
            isSupported: true,
            isRestoring: signal(false),
            refresh: vi.fn().mockResolvedValue([]),
            restore,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RoomRestoreBannerComponent);
    fixture.detectChanges();
  }

  function banner(): HTMLElement | null {
    return fixture.nativeElement.querySelector('button');
  }

  beforeEach(() => {
    snapshots = signal<readonly RoomSnapshotMeta[]>([snapshot]);
    restore = vi.fn().mockResolvedValue(true);
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as IPeerContext);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.GameMaster;
  });

  afterEach(() => {
    PeerCursor.myCursor = null!;
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('shows the banner offline when there is something to restore', async () => {
    await setup();
    expect(banner()).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('2026/07/03 09:05');
  });

  it('shows none when there is nothing', async () => {
    snapshots.set([]);
    await setup();
    expect(banner()).toBeNull();
  });

  it('shows none while it is in a room', async () => {
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: 'room' } as IPeerContext);
    await setup();
    expect(banner()).toBeNull();
  });

  it('shows none without permission to edit', async () => {
    PeerCursor.myCursor.role = PeerRole.Guest;
    await setup();
    expect(banner()).toBeNull();
  });

  it('restores the latest snapshot and closes the banner', async () => {
    await setup();
    banner()!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(restore).toHaveBeenCalledWith(snapshot.id);
    expect(banner()).toBeNull();
  });

  it('closes it on a later', async () => {
    await setup();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLElement>;
    buttons[1].click();
    fixture.detectChanges();

    expect(restore).not.toHaveBeenCalled();
    expect(banner()).toBeNull();
  });
});
