import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import { ReplayEntryListComponent } from '@axe/features/replay/replay-workspace/replay-entry-list.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function event(seq: number, text: string): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'alice',
    detail: { name: '盗賊', text },
    visibility: PUBLIC_VISIBILITY,
  };
}

const events: readonly ReplayEvent[] = [event(1, 'ひとつめ'), event(2, 'ふたつめ'), event(3, 'みっつめ')];

function dragEvent(name: string, clientY = 0): Event {
  const fired = new Event(name, { bubbles: true, cancelable: true });
  Object.defineProperty(fired, 'clientY', { value: clientY });
  Object.defineProperty(fired, 'dataTransfer', { value: { effectAllowed: '', setData: vi.fn() } });
  return fired;
}

function place(row: HTMLElement, top: number): void {
  Object.defineProperty(row, 'getBoundingClientRect', { value: () => ({ top, height: 20 }) });
}

describe('ReplayEntryListComponent の並べ替え', () => {
  let fixture: ComponentFixture<ReplayEntryListComponent>;
  let move: ReturnType<typeof vi.fn>;

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li[draggable="true"]'));
  }

  function dragTo(from: number, to: number, clientY: number): void {
    const source = rows()[from];
    const destination = rows()[to];
    place(destination, 100);
    source.dispatchEvent(dragEvent('dragstart'));
    destination.dispatchEvent(dragEvent('dragover', clientY));
    fixture.detectChanges();
    destination.dispatchEvent(dragEvent('drop'));
  }

  beforeEach(async () => {
    move = vi.fn();
    PeerCursor.myCursor = Object.assign(new PeerCursor(), { peerId: 'p', userId: 'gm', role: PeerRole.GameMaster });

    await TestBed.configureTestingModule({
      imports: [ReplayEntryListComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: ReplayPlaybackService,
          useValue: {
            events: signal(events).asReadonly(),
            cursor: signal(0).asReadonly(),
            manifest: signal(null).asReadonly(),
            cast: signal([]).asReadonly(),
            isBoardMode: signal(false).asReadonly(),
            seekTo: vi.fn().mockResolvedValue(undefined),
            enterBoardMode: vi.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ReplayEditorService,
          useValue: {
            edited: signal(events).asReadonly(),
            isInserted: () => false,
            insert: vi.fn(),
            move,
            remove: vi.fn(),
            retext: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplayEntryListComponent);
    fixture.componentRef.setInput('editing', true);
    fixture.detectChanges();
  });

  afterEach(() => {
    PeerCursor.myCursor = null as unknown as PeerCursor;
  });

  it('行間の差し込みボタンに読める名前を付けること', () => {
    const labels: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('button[aria-label]'),
      (button) => (button as HTMLElement).getAttribute('aria-label') ?? ''
    );
    expect(labels.every((label) => !label.startsWith('feature.'))).toBe(true);
  });

  it('編集中だけつまめること', () => {
    expect(rows()).toHaveLength(3);

    fixture.componentRef.setInput('editing', false);
    fixture.detectChanges();
    expect(rows()).toHaveLength(0);
  });

  it('下半分に落とせばその次へ移すこと', () => {
    dragTo(0, 2, 115);
    expect(move).toHaveBeenCalledWith(1, 2);
  });

  it('上半分に落とせばその手前へ移すこと', () => {
    dragTo(2, 0, 105);
    expect(move).toHaveBeenCalledWith(3, -2);
  });

  it('同じところへ落としても動かさないこと', () => {
    dragTo(1, 1, 105);
    expect(move).not.toHaveBeenCalled();
  });

  it('並べ替えの落下を卓の取り込みへ渡さないこと', () => {
    // ここで通してしまうと、行を並べ替えただけで「ファイルを落とした」経路が走る。
    const onDocument = vi.fn();
    document.body.addEventListener('drop', onDocument);
    document.body.addEventListener('dragover', onDocument);

    try {
      dragTo(0, 2, 115);
    } finally {
      document.body.removeEventListener('drop', onDocument);
      document.body.removeEventListener('dragover', onDocument);
    }

    expect(move).toHaveBeenCalledWith(1, 2);
    expect(onDocument).not.toHaveBeenCalled();
  });

  it('落とす先を線で示すこと', () => {
    const source = rows()[0];
    const destination = rows()[2];
    place(destination, 100);
    source.dispatchEvent(dragEvent('dragstart'));
    destination.dispatchEvent(dragEvent('dragover', 115));
    fixture.detectChanges();

    expect(rows()[2].style.boxShadow).toContain('inset 0 -2px');
    expect(rows()[0].classList).toContain('opacity-40');
  });

  it('つまむのをやめたら印を消すこと', () => {
    const source = rows()[0];
    const destination = rows()[2];
    place(destination, 100);
    source.dispatchEvent(dragEvent('dragstart'));
    destination.dispatchEvent(dragEvent('dragover', 115));
    source.dispatchEvent(dragEvent('dragend'));
    fixture.detectChanges();

    expect(rows()[2].style.boxShadow).toBe('');
    expect(move).not.toHaveBeenCalled();
  });
});
