import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { Network } from '@axe/core/index';
import { PeerSessionGrade } from '@axe/core/network/peer-session-state';
import { PeerLinkQuality } from '@axe/domain/peer/peer-link-quality';
import { ConnectionQualityComponent } from '@axe/features/widgets/connection-quality/connection-quality.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

interface ComponentInternals {
  links: () => { peerId: string; name: string; quality: PeerLinkQuality; ping: number; isRelayed: boolean }[];
  worst: () => PeerLinkQuality;
  hasRelayedLink: () => boolean;
  close: () => void;
}

function peerContext(peerId: string, overrides: Record<string, unknown> = {}) {
  return {
    peerId,
    isOpen: true,
    session: {
      grade: PeerSessionGrade.HIGH,
      ping: 40,
      health: 1,
      speed: 1,
      description: 'host',
      ...(overrides['session'] as Record<string, unknown>),
    },
    ...overrides,
  };
}

describe('ConnectionQualityComponent', () => {
  let fixture: ComponentFixture<ConnectionQualityComponent>;
  let internals: ComponentInternals;
  let objectChange: ObjectChangeService;
  let widgets: WidgetVisibilityService;

  function panel(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.connection-quality');
  }

  function create(visible = true) {
    fixture = TestBed.createComponent(ConnectionQualityComponent);
    internals = fixture.componentInstance as unknown as ComponentInternals;
    objectChange = TestBed.inject(ObjectChangeService);
    widgets = TestBed.inject(WidgetVisibilityService);
    widgets.connectionQuality.set(visible);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ConnectionQualityComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ウィジェットが非表示のときは何も描画しない', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([peerContext('peer-a')] as never);
    create(false);

    expect(panel()).toBeNull();
  });

  it('ウィジェットが表示のときはパネルを描画する', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([peerContext('peer-a')] as never);
    create();

    expect(panel()).not.toBeNull();
  });

  it('閉じるとウィジェットの表示状態が false になる', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([peerContext('peer-a')] as never);
    create();

    internals.close();
    fixture.detectChanges();

    expect(widgets.connectionQuality()).toBe(false);
    expect(panel()).toBeNull();
  });

  it('接続中のピアごとに1行を作る', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([peerContext('peer-a'), peerContext('peer-b')] as never);
    create();

    expect(internals.links().map((link) => link.peerId)).toEqual(['peer-a', 'peer-b']);
  });

  it('ピアが居なくてもパネル自体は開いたままにする', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([] as never);
    create();

    expect(internals.links()).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it('見出しは最も悪いリンクを示す', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([
      peerContext('peer-a'),
      peerContext('peer-b', { session: { ping: 800 } }),
    ] as never);
    create();

    expect(internals.worst()).toBe(PeerLinkQuality.Poor);
  });

  it('中継経由のリンクがあると印を出す', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([
      peerContext('peer-a', { session: { grade: PeerSessionGrade.LOW } }),
    ] as never);
    create();

    expect(internals.hasRelayedLink()).toBe(true);
    expect(internals.links()[0].isRelayed).toBe(true);
  });

  it('名前が未解決ならピア ID の先頭を出す', () => {
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([peerContext('abcdef123456')] as never);
    create();

    expect(internals.links()[0].name).toBe('abcdef');
  });

  it('統計の更新シグナルで再計算する', () => {
    const contexts = [peerContext('peer-a')];
    vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue(contexts as never);
    create();
    expect(internals.worst()).toBe(PeerLinkQuality.Good);

    contexts[0].session.ping = 900;
    objectChange.peerStatsVersion.update((v) => v + 1);

    expect(internals.worst()).toBe(PeerLinkQuality.Poor);
  });
});
