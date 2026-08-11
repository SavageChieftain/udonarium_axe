import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { encodeDiceRollDetail } from '@axe/domain/dice/dice-roll-detail';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  GM_ONLY_VISIBILITY,
  PUBLIC_VISIBILITY,
  type ReplayEvent,
  ReplayEventKind,
} from '@axe/domain/replay/replay-event';
import { ReplayDigestPanelComponent } from '@axe/features/replay/replay-digest-panel/replay-digest-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

const MANIFEST = {
  roomName: '第一夜',
  startedAt: 0,
  endedAt: null,
  actors: [
    { userId: 'alice', peerId: 'p1', name: 'アリス', role: PeerRole.Player, imageIdentifier: '', sinceSeq: 0 },
    { userId: 'gm', peerId: 'p2', name: 'GM', role: PeerRole.GameMaster, imageIdentifier: '', sinceSeq: 0 },
  ],
  targets: [{ identifier: 'char-1', aliasName: 'character', name: 'ゴブリン', sinceSeq: 0 }],
};

function say(seq: number, actorId = 'alice', overrides: Partial<ReplayEvent> = {}): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId,
    detail: { text: 'やあ', name: 'アリス' },
    visibility: PUBLIC_VISIBILITY,
    ...overrides,
  };
}

function roll(seq: number, value: number, outcome = ''): ReplayEvent {
  return {
    ...say(seq),
    kind: ReplayEventKind.ChatDice,
    detail: {
      dicebot: encodeDiceRollDetail({
        system: 'Cthulhu',
        faces: [{ sides: 6, value, kind: 'normal' }],
        outcome: outcome as '',
      }),
    },
  };
}

describe('ReplayDigestPanelComponent', () => {
  let fixture: ComponentFixture<ReplayDigestPanelComponent>;
  let events: readonly ReplayEvent[];
  let role: PeerRole;

  function numberOf(label: string): string {
    const cells = [...(fixture.nativeElement as HTMLElement).querySelectorAll('div.grid > div')];
    const cell = cells.find((item) => item.querySelector('span')?.textContent?.trim() === label);
    return cell?.querySelectorAll('span')[1]?.textContent?.trim() ?? '';
  }

  async function setup(): Promise<void> {
    PeerCursor.myCursor = Object.assign(new PeerCursor(), { peerId: 'p', userId: 'alice', role });

    await TestBed.configureTestingModule({
      imports: [ReplayDigestPanelComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: ReplayPlaybackService,
          useValue: { events: signal(events).asReadonly(), manifest: signal(MANIFEST).asReadonly() },
        },
        {
          provide: ReplayEditorService,
          useValue: { isEditing: signal(false).asReadonly(), edited: signal([]).asReadonly() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplayDigestPanelComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    role = PeerRole.Player;
    events = [say(1), say(2), roll(3, 6, 'critical')];
  });

  afterEach(() => {
    PeerCursor.myCursor = null as unknown as PeerCursor;
  });

  it('数と人別のダイスの出方を出すこと', async () => {
    await setup();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('ダイスの出方');
    expect(text).toContain('アリス');
    expect(text).not.toContain('出目が残っていません');
  });

  it('出目が残っていない記録では、その旨を言うこと', async () => {
    events = [say(1), { ...say(2), kind: ReplayEventKind.ChatDice, detail: { dicebot: '' } }];
    await setup();

    expect(fixture.nativeElement.textContent).toContain('出目が残っていません');
  });

  it('増減が残っていない記録では、ダメージ帳を出さないこと', async () => {
    await setup();

    expect(fixture.nativeElement.textContent).toContain('増減が残っていません');
  });

  it('見えない発言を数に入れないこと', async () => {
    events = [say(1), { ...say(2, 'gm'), visibility: GM_ONLY_VISIBILITY }];
    await setup();

    expect(numberOf('発言')).toBe('1');
  });

  it('まとめるものが無ければ、その旨だけを出すこと', async () => {
    events = [];
    await setup();

    expect(fixture.nativeElement.textContent).toContain('まとめるものがありません');
  });
});
