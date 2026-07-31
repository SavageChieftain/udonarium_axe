import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomJoinService } from '@axe/application/lobby/room-join.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { IRoomInfo, RoomInfo } from '@axe/core/network/room-info';
import { buildInviteLink } from '@axe/domain/peer/invite-link';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { InviteJoinComponent } from '@axe/features/lobby/invite-join/invite-join.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function createRoom(withPassword = false): IRoomInfo {
  const peer = PeerContext.parse('peer-1');
  peer.roomId = 'a1b';
  peer.roomName = 'room';
  if (withPassword) peer.password = 'pw';
  vi.spyOn(peer, 'verifyPassword').mockResolvedValue(true);
  return new RoomInfo('a1b', 'room', [peer]);
}

describe('InviteJoinComponent', () => {
  let fixture: ComponentFixture<InviteJoinComponent>;
  let findRoom: ReturnType<typeof vi.fn>;
  let join: ReturnType<typeof vi.fn>;
  let modalOpen: ReturnType<typeof vi.fn>;
  let originalMyCursor: PeerCursor;

  async function setup(hash: string): Promise<void> {
    location.hash = hash;
    await TestBed.configureTestingModule({
      imports: [InviteJoinComponent],
      providers: [...TEST_PROVIDERS, { provide: RoomJoinService, useValue: { findRoom, join } }],
    }).compileComponents();
    TestBed.overrideProvider(ModalService, { useValue: { open: modalOpen } });
    fixture = TestBed.createComponent(InviteJoinComponent);
    fixture.detectChanges();
  }

  function bannerText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  async function eventually(assert: () => void): Promise<void> {
    await vi.waitFor(() => {
      fixture.detectChanges();
      assert();
    });
  }

  async function flush(): Promise<void> {
    for (let i = 0; i < 10; i++) await Promise.resolve();
    fixture.detectChanges();
  }

  beforeEach(() => {
    findRoom = vi.fn().mockResolvedValue(createRoom());
    join = vi.fn().mockResolvedValue(true);
    modalOpen = vi.fn().mockResolvedValue('');
    originalMyCursor = PeerCursor.myCursor;
    PeerCursor.myCursor = { reConnectPass: '', role: PeerRole.Player, update: vi.fn() } as unknown as PeerCursor;
    vi.spyOn(Network, 'isOpen', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    location.hash = '';
    PeerCursor.myCursor = originalMyCursor;
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('招待リンクでなければ何も表示せず参加も試みない', async () => {
    await setup('');
    await flush();

    expect(bannerText().trim()).toBe('');
    expect(findRoom).not.toHaveBeenCalled();
  });

  it('招待リンクなら部屋を探して参加する', async () => {
    await setup('#join?r=a1b&n=room');

    await eventually(() => expect(join).toHaveBeenCalledOnce());
    expect(findRoom).toHaveBeenCalledWith('a1b');
  });

  it('参加に成功したらバナーを消す', async () => {
    await setup('#join?r=a1b&n=room');

    await eventually(() => expect(bannerText().trim()).toBe(''));
  });

  it('ロールが指定されていれば適用する', async () => {
    await setup('#join?r=a1b&n=room&role=guest');

    await eventually(() => expect(PeerCursor.myCursor.role).toBe(PeerRole.Guest));
  });

  it('部屋が見つからなければ通知を出す', async () => {
    findRoom.mockResolvedValue(null);
    await setup('#join?r=a1b&n=room');

    await eventually(() => expect(bannerText()).toContain('見つかりません'));
    expect(join).not.toHaveBeenCalled();
  });

  it('参加に失敗したら通知を出す', async () => {
    join.mockResolvedValue(false);
    await setup('#join?r=a1b&n=room');

    await eventually(() => expect(bannerText()).toContain('参加できません'));
  });

  it('合言葉付きの部屋でリンクに合言葉が無ければ入力を求める', async () => {
    findRoom.mockResolvedValue(createRoom(true));
    await setup('#join?r=a1b&n=room');

    await eventually(() => expect(modalOpen).toHaveBeenCalledOnce());
  });

  it('リンクに合言葉があれば入力を求めない', async () => {
    findRoom.mockResolvedValue(createRoom(true));
    await setup(buildInviteLink('', { roomId: 'a1b', roomName: 'room', password: 'pw', role: null }));

    await eventually(() => expect(join).toHaveBeenCalledWith(expect.anything(), 'pw'));
    expect(modalOpen).not.toHaveBeenCalled();
  });
});
