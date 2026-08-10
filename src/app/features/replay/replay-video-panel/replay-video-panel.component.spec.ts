import { signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { ReplayVideoService } from '@axe/application/replay/replay-video.service';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import { ReplayVideoPanelComponent } from '@axe/features/replay/replay-video-panel/replay-video-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function say(seq: number, text: string): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'alice',
    detail: { text, name: 'アリス' },
    visibility: PUBLIC_VISIBILITY,
  };
}

const meta: ReplayRecordingMeta = {
  id: 7,
  roomName: '第一夜',
  startedAt: 0,
  endedAt: null,
  eventCount: 2,
  byteSize: 0,
};

describe('ReplayVideoPanelComponent', () => {
  let fixture: ComponentFixture<ReplayVideoPanelComponent>;
  let render: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;
  let isRendering: WritableSignal<boolean>;
  let progress: WritableSignal<number>;
  let isSupported = true;
  let recordings: readonly ReplayRecordingMeta[];
  let events: readonly ReplayEvent[];
  let isEditing: WritableSignal<boolean>;
  let edited: WritableSignal<readonly ReplayEvent[]>;

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes(text)
    ) as HTMLButtonElement | undefined;
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReplayVideoPanelComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: ReplayVideoService,
          useValue: {
            isRendering: isRendering.asReadonly(),
            progress: progress.asReadonly(),
            failed: signal(false).asReadonly(),
            get isSupported() {
              return isSupported;
            },
            render,
            cancel,
          },
        },
        {
          provide: ReplayPlaybackService,
          useValue: {
            recordingId: signal<number | null>(7).asReadonly(),
            events: signal(events).asReadonly(),
            cast: signal([]).asReadonly(),
            manifest: signal({ roomName: '第一夜', startedAt: 0, endedAt: null, actors: [], targets: [] }).asReadonly(),
          },
        },
        {
          provide: ReplayEditorService,
          useValue: { isEditing: isEditing.asReadonly(), edited: edited.asReadonly() },
        },
        {
          provide: ReplayRecorderService,
          useValue: { recordings: signal<readonly ReplayRecordingMeta[]>(recordings).asReadonly() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplayVideoPanelComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    render = vi.fn().mockResolvedValue(true);
    cancel = vi.fn();
    isRendering = signal(false);
    progress = signal(0);
    isSupported = true;
    recordings = [meta];
    events = [say(1, 'やあ'), say(2, 'こんばんは')];
    isEditing = signal(false);
    edited = signal<readonly ReplayEvent[]>([]);
    PeerCursor.myCursor = Object.assign(new PeerCursor(), { peerId: 'p', userId: 'gm', role: PeerRole.GameMaster });
  });

  afterEach(() => {
    PeerCursor.myCursor = null as unknown as PeerCursor;
  });

  it('書き出す前に長さとカット数を知らせること', async () => {
    await setup();
    buttonByText('動画にする')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 カット');
  });

  it('盤面の動きも読める言葉のカットにすること', async () => {
    events = [
      say(1, 'やあ'),
      {
        ...say(2, ''),
        kind: ReplayEventKind.ObjectMove,
        targetId: 'c1',
        detail: { from: { name: 'table', x: 0, y: 0, z: 0 }, to: { name: 'table', x: 100, y: 50, z: 0 } },
      },
    ];
    await setup();

    buttonByText('動画にする')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 カット');
  });

  it('選んだ大きさと間の取り方で頼むこと', async () => {
    await setup();
    buttonByText('動画にする')?.click();
    fixture.detectChanges();

    const [size, pacing] = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    size.value = '720p';
    size.dispatchEvent(new Event('change'));
    pacing.value = 'recorded';
    pacing.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    buttonByText('書き出す')?.click();
    await fixture.whenStable();

    expect(render).toHaveBeenCalledWith(
      meta,
      events,
      expect.objectContaining({ size: { width: 1280, height: 720 }, pacing: 'recorded' }),
      { userId: 'gm', role: PeerRole.GameMaster }
    );
  });

  it('編集中は編集後の並びを渡すこと', async () => {
    isEditing = signal(true);
    edited = signal<readonly ReplayEvent[]>([say(1, '書き直した')]);
    await setup();

    buttonByText('動画にする')?.click();
    fixture.detectChanges();
    buttonByText('書き出す')?.click();
    await fixture.whenStable();

    expect(render.mock.calls[0][1]).toEqual(edited());
  });

  it('画にできる場面が無ければ書き出させないこと', async () => {
    events = [{ ...say(1, ''), kind: ReplayEventKind.PeerJoin, detail: {} }];
    await setup();

    buttonByText('動画にする')?.click();
    fixture.detectChanges();

    expect(buttonByText('書き出す')?.disabled).toBe(true);
  });

  it('一覧に載る前の記録でも書き出せること', async () => {
    recordings = [];
    await setup();

    buttonByText('動画にする')?.click();
    fixture.detectChanges();
    buttonByText('書き出す')?.click();
    await fixture.whenStable();

    expect(render.mock.calls[0][0]).toMatchObject({ id: 7, roomName: '第一夜' });
  });

  it('書き出せない環境では押させないこと', async () => {
    isSupported = false;
    await setup();

    expect(buttonByText('動画にする')?.disabled).toBe(true);
  });

  it('書き出し中は進み具合とやめる手を出すこと', async () => {
    isRendering = signal(true);
    progress = signal(0.42);
    await setup();

    expect(fixture.nativeElement.textContent).toContain('42');
    buttonByText('やめる')?.click();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
