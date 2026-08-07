import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  PUBLIC_VISIBILITY,
  REPLAY_FORMAT_VERSION,
  ReplayDetailLevel,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayManifest,
} from '@axe/domain/replay/replay-event';
import { ReplayPlayerPanelComponent } from '@axe/features/replay/replay-player-panel/replay-player-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

const events: ReplayEvent[] = [
  {
    seq: 1,
    at: 1000,
    t: 0,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'alice',
    detail: { name: '盗賊', text: 'こんばんは' },
    visibility: PUBLIC_VISIBILITY,
  },
  {
    seq: 2,
    at: 6000,
    t: 5000,
    kind: ReplayEventKind.ObjectMove,
    actorId: 'bob',
    targetId: 'c1',
    detail: { to: { name: 'table', x: 100, y: 50, z: 0 } },
    visibility: PUBLIC_VISIBILITY,
  },
];

const manifest: ReplayManifest = {
  formatVersion: REPLAY_FORMAT_VERSION,
  roomName: '第一夜',
  startedAt: 0,
  endedAt: null,
  recordedBy: { userId: 'gm', peerId: 'p', name: 'GM', role: PeerRole.GameMaster, imageIdentifier: '', sinceSeq: 0 },
  detailLevel: ReplayDetailLevel.Notable,
  actors: [
    { userId: 'alice', peerId: 'p1', name: 'アリス', role: PeerRole.Player, imageIdentifier: '', sinceSeq: 0 },
    { userId: 'bob', peerId: 'p2', name: 'ボブ', role: PeerRole.Player, imageIdentifier: '', sinceSeq: 0 },
  ],
  targets: [{ identifier: 'c1', aliasName: 'character', name: '盗賊', sinceSeq: 0 }],
  keyframes: [],
  chunks: [],
};

describe('ReplayPlayerPanelComponent', () => {
  let fixture: ComponentFixture<ReplayPlayerPanelComponent>;
  let isOpen: ReturnType<typeof signal<boolean>>;
  let cursor: ReturnType<typeof signal<number>>;
  let isBoardMode: ReturnType<typeof signal<boolean>>;
  let playback: Record<string, unknown>;
  const originalConfirm = window.confirm;

  async function setup(): Promise<void> {
    playback = {
      isOpen: isOpen.asReadonly(),
      cursor: cursor.asReadonly(),
      isBoardMode: isBoardMode.asReadonly(),
      isSeeking: signal(false).asReadonly(),
      autoPlay: signal(false).asReadonly(),
      isAtStart: signal(false).asReadonly(),
      isAtEnd: signal(false).asReadonly(),
      events: signal<readonly ReplayEvent[]>(events).asReadonly(),
      manifest: signal<ReplayManifest | null>(manifest).asReadonly(),
      currentEvent: signal<ReplayEvent | null>(events[0]).asReadonly(),
      open: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
      seekTo: vi.fn().mockResolvedValue(undefined),
      next: vi.fn().mockResolvedValue(undefined),
      previous: vi.fn().mockResolvedValue(undefined),
      toStart: vi.fn().mockResolvedValue(undefined),
      toEnd: vi.fn().mockResolvedValue(undefined),
      toggleAutoPlay: vi.fn(),
      enterBoardMode: vi.fn().mockResolvedValue(true),
      exitBoardMode: vi.fn().mockResolvedValue(undefined),
    };

    const recordings: ReplayRecordingMeta[] = [
      { id: 7, roomName: '第一夜', startedAt: 0, endedAt: 1, eventCount: 2, byteSize: 100 },
    ];

    await TestBed.configureTestingModule({
      imports: [ReplayPlayerPanelComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: ReplayPlaybackService, useValue: playback },
        {
          provide: ReplayRecorderService,
          useValue: {
            recordings: signal<readonly ReplayRecordingMeta[]>(recordings).asReadonly(),
            refresh: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReplayPlayerPanelComponent);
    fixture.detectChanges();
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes(text)
    ) as HTMLButtonElement | undefined;
  }

  beforeEach(() => {
    isOpen = signal(true);
    cursor = signal(0);
    isBoardMode = signal(false);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    vi.restoreAllMocks();
  });

  it('当時の名前で行を組み立てること', async () => {
    await setup();
    const rows = [...fixture.nativeElement.querySelectorAll('ul > li')] as HTMLElement[];
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('ボブ');
    expect(rows[1].textContent).toContain('盗賊');
  });

  it('選んだ記録を開くこと', async () => {
    await setup();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '7';
    select.dispatchEvent(new Event('change'));

    expect(playback['open']).toHaveBeenCalledWith(7);
  });

  it('行を押した位置へ飛ぶこと', async () => {
    await setup();
    const rows = [...fixture.nativeElement.querySelectorAll('ul > li')] as HTMLElement[];
    rows[1].click();
    expect(playback['seekTo']).toHaveBeenCalledWith(1);
  });

  it('確認してから盤面再生に入ること', async () => {
    window.confirm = (() => true) as typeof window.confirm;
    await setup();
    buttonByText('盤面を映す')?.click();
    expect(playback['enterBoardMode']).toHaveBeenCalledTimes(1);
  });

  it('確認を断ったら盤面再生に入らないこと', async () => {
    window.confirm = (() => false) as typeof window.confirm;
    await setup();
    buttonByText('盤面を映す')?.click();
    expect(playback['enterBoardMode']).not.toHaveBeenCalled();
  });

  it('盤面再生中は卓に戻せること', async () => {
    isBoardMode = signal(true);
    await setup();
    buttonByText('卓に戻す')?.click();
    expect(playback['exitBoardMode']).toHaveBeenCalledTimes(1);
  });

  it('編集に入ると行に並べ替えと削除が出ること', async () => {
    await setup();
    expect(fixture.nativeElement.querySelectorAll('input[type="text"]')).toHaveLength(0);

    buttonByText('編集')?.click();
    fixture.detectChanges();

    const rows = [...fixture.nativeElement.querySelectorAll('ul > li')] as HTMLElement[];
    expect(rows[0].querySelector('input[type="text"]')).not.toBeNull();
    expect(rows[1].querySelector('input[type="text"]')).toBeNull();
  });

  it('編集中は行を押しても位置が動かないこと', async () => {
    await setup();
    buttonByText('編集')?.click();
    fixture.detectChanges();

    const rows = [...fixture.nativeElement.querySelectorAll('ul > li')] as HTMLElement[];
    rows[1].click();
    expect(playback['seekTo']).not.toHaveBeenCalled();
  });

  it('行を消すと一覧から消えること', async () => {
    await setup();
    buttonByText('編集')?.click();
    fixture.detectChanges();

    const remove = fixture.nativeElement.querySelector('[aria-label="この行を消す"]') as HTMLButtonElement;
    remove.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('ul > li')).toHaveLength(1);
  });

  it('内容を入れて好きな位置に差し込めること', async () => {
    await setup();
    buttonByText('編集')?.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.querySelector('input[placeholder="差し込む内容"]') as HTMLInputElement;
    text.value = '語り: そのとき扉が開いた';
    text.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const inserts = [...fixture.nativeElement.querySelectorAll('[aria-label="この行の後ろに差し込む"]')];
    (inserts[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const rows = [...fixture.nativeElement.querySelectorAll('ul > li')] as HTMLElement[];
    expect(rows).toHaveLength(3);
    expect(rows[1].querySelector('input[type="text"]')).not.toBeNull();
  });

  it('内容が空なら差し込めないこと', async () => {
    await setup();
    buttonByText('編集')?.click();
    fixture.detectChanges();

    const insert = fixture.nativeElement.querySelector('[aria-label="この行の後ろに差し込む"]') as HTMLButtonElement;
    expect(insert.disabled).toBe(true);
  });

  it('記録を開いていなければ案内を出すこと', async () => {
    isOpen = signal(false);
    await setup();
    expect(fixture.nativeElement.textContent).toContain('再生する記録を選んでください');
  });
});
