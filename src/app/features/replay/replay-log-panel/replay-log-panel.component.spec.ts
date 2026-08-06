import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  PUBLIC_VISIBILITY,
  ReplayDetailLevel,
  type ReplayEvent,
  ReplayEventKind,
} from '@axe/domain/replay/replay-event';
import { ReplayLogPanelComponent } from '@axe/features/replay/replay-log-panel/replay-log-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ReplayLogPanelComponent', () => {
  const events: ReplayEvent[] = [
    {
      seq: 1,
      at: new Date(2026, 0, 1, 20, 30, 0).getTime(),
      t: 0,
      kind: ReplayEventKind.ChatMessage,
      actorId: 'alice',
      targetId: 'm1',
      detail: { name: '盗賊', text: 'こんばんは' },
      visibility: PUBLIC_VISIBILITY,
    },
    {
      seq: 2,
      at: new Date(2026, 0, 1, 20, 30, 5).getTime(),
      t: 5000,
      kind: ReplayEventKind.ObjectMove,
      actorId: 'bob',
      targetId: 'c1',
      detail: { from: { name: 'table', x: 0, y: 0, z: 0 }, to: { name: 'table', x: 100, y: 50, z: 0 } },
      visibility: PUBLIC_VISIBILITY,
    },
  ];

  let fixture: ComponentFixture<ReplayLogPanelComponent>;
  let recentEvents: ReturnType<typeof signal<readonly ReplayEvent[]>>;
  let isRecording: ReturnType<typeof signal<boolean>>;
  let start: ReturnType<typeof vi.fn>;
  let stop: ReturnType<typeof vi.fn>;
  let mark: ReturnType<typeof vi.fn>;

  async function setup(recordings: ReplayRecordingMeta[] = []): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReplayLogPanelComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: ReplayRecorderService,
          useValue: {
            isSupported: true,
            isRecording: isRecording.asReadonly(),
            eventCount: signal(events.length).asReadonly(),
            startedAt: signal(events[0].at).asReadonly(),
            recentEvents: recentEvents.asReadonly(),
            detailLevel: signal(ReplayDetailLevel.Notable).asReadonly(),
            recordings: signal<readonly ReplayRecordingMeta[]>(recordings).asReadonly(),
            refresh: vi.fn().mockResolvedValue([]),
            setDetailLevel: vi.fn(),
            actorNameOf: (userId: string) => ({ alice: 'アリス', bob: 'ボブ' })[userId] ?? userId,
            targetNameOf: (identifier: string) => ({ c1: '盗賊', m1: '' })[identifier] ?? identifier,
            start,
            stop,
            mark,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReplayLogPanelComponent);
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll('ul > li')] as HTMLElement[];
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes(text)
    ) as HTMLButtonElement | undefined;
  }

  beforeEach(() => {
    recentEvents = signal<readonly ReplayEvent[]>(events);
    isRecording = signal(true);
    start = vi.fn().mockResolvedValue(true);
    stop = vi.fn().mockResolvedValue(undefined);
    mark = vi.fn().mockResolvedValue(undefined);

    PeerCursor.myCursor = { userId: 'alice', role: PeerRole.GameMaster } as PeerCursor;
  });

  afterEach(() => {
    PeerCursor.myCursor = null!;
  });

  it('新しい順に行を並べること', async () => {
    await setup();
    const texts = rows().map((row) => row.textContent ?? '');
    expect(texts[0]).toContain('20:30:05');
    expect(texts[1]).toContain('20:30:00');
  });

  it('誰が何をどうしたかを 1 行で見せること', async () => {
    await setup();
    expect(rows()[0].textContent).toContain('ボブ');
    expect(rows()[0].textContent).toContain('盗賊');
    expect(rows()[0].textContent).toContain('100');
  });

  it('絞り込みで盤面の行だけにできること', async () => {
    await setup();
    buttonByText('盤面')?.click();
    fixture.detectChanges();

    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('ボブ');
  });

  it('記録が空なら空の案内を出すこと', async () => {
    recentEvents = signal<readonly ReplayEvent[]>([]);
    await setup();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('まだ記録がありません');
  });

  it('記録中は停止を押せること', async () => {
    await setup();
    buttonByText('記録停止')?.click();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('停止中は開始を押せること', async () => {
    isRecording = signal(false);
    await setup();
    buttonByText('記録開始')?.click();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('見出しを入れて目印を打てること', async () => {
    await setup();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = '第二幕';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    buttonByText('目印')?.click();
    expect(mark).toHaveBeenCalledWith('第二幕');
  });

  it('見出しが空なら目印を打たないこと', async () => {
    await setup();
    buttonByText('目印')?.click();
    expect(mark).not.toHaveBeenCalled();
  });
});
