import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  GM_ONLY_VISIBILITY,
  PUBLIC_VISIBILITY,
  type ReplayEvent,
  ReplayEventKind,
} from '@axe/domain/replay/replay-event';
import { ReplayScriptPanelComponent } from '@axe/features/replay/replay-script-panel/replay-script-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function say(seq: number, text: string, overrides: Partial<ReplayEvent> = {}): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'alice',
    detail: { text, name: 'アリス' },
    visibility: PUBLIC_VISIBILITY,
    ...overrides,
  };
}

describe('ReplayScriptPanelComponent', () => {
  let fixture: ComponentFixture<ReplayScriptPanelComponent>;
  let saved: { blob: Blob; name: string }[];
  let events: readonly ReplayEvent[];
  let role: PeerRole;

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes(text)
    ) as HTMLButtonElement | undefined;
  }

  async function setup(): Promise<void> {
    PeerCursor.myCursor = Object.assign(new PeerCursor(), { peerId: 'p', userId: 'gm', role });

    await TestBed.configureTestingModule({
      imports: [ReplayScriptPanelComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: ReplayPlaybackService,
          useValue: {
            events: signal(events).asReadonly(),
            cast: signal([]).asReadonly(),
            manifest: signal({ roomName: '第一夜', startedAt: 0, endedAt: null, actors: [], targets: [] }).asReadonly(),
          },
        },
        {
          provide: ReplayEditorService,
          useValue: { isEditing: signal(false).asReadonly(), edited: signal([]).asReadonly() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplayScriptPanelComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    saved = [];
    role = PeerRole.GameMaster;
    events = [say(1, 'やあ'), say(2, 'こんばんは')];

    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved.push({ blob: blob as Blob, name: '' });
      return 'blob:script';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      if (saved.length > 0) saved[saved.length - 1].name = this.download;
    });
  });

  afterEach(() => {
    PeerCursor.myCursor = null as unknown as PeerCursor;
    vi.restoreAllMocks();
  });

  it('書き出す前に行数を知らせること', async () => {
    await setup();
    buttonByText('読み物にする')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 行');
  });

  it('Markdown として保存すること', async () => {
    await setup();
    buttonByText('読み物にする')?.click();
    fixture.detectChanges();
    buttonByText('書き出す')?.click();

    expect(saved).toHaveLength(1);
    expect(saved[0].name.endsWith('.md')).toBe(true);
    expect(saved[0].name.startsWith('第一夜_')).toBe(true);
    expect(await saved[0].blob.text()).toContain('アリス「やあ」');
  });

  it('台本を選べば話者を行頭に置くこと', async () => {
    await setup();
    buttonByText('読み物にする')?.click();
    fixture.detectChanges();

    const format = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    format.value = 'script';
    format.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    buttonByText('書き出す')?.click();

    expect(await saved[0].blob.text()).toContain('**アリス**');
  });

  it('見せられない発言を書き出す人のロールで外すこと', async () => {
    events = [say(1, 'やあ'), say(2, '内緒話', { visibility: GM_ONLY_VISIBILITY })];
    role = PeerRole.Player;
    await setup();

    buttonByText('読み物にする')?.click();
    fixture.detectChanges();
    buttonByText('書き出す')?.click();

    // 動画と同じ扱い。PL が書き出したものに GM 限定の発言を混ぜない。
    const text = await saved[0].blob.text();
    expect(text).toContain('やあ');
    expect(text).not.toContain('内緒話');
  });

  it('書けるものが無ければ押させないこと', async () => {
    events = [{ ...say(1, ''), kind: ReplayEventKind.PeerJoin, detail: {} }];
    await setup();

    buttonByText('読み物にする')?.click();
    fixture.detectChanges();

    expect(buttonByText('書き出す')?.disabled).toBe(true);
  });
});
