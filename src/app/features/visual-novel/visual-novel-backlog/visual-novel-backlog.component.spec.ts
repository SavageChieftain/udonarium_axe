import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { VisualNovelBacklogComponent } from '@axe/features/visual-novel/visual-novel-backlog/visual-novel-backlog.component';
import { VN_MESSAGE_KINDS } from '@axe/features/visual-novel/visual-novel-emote';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelBacklogComponent', () => {
  let component: VisualNovelBacklogComponent;
  let fixture: ComponentFixture<VisualNovelBacklogComponent>;
  let tab: ChatTab;
  let nextTimestamp = 1000;
  let nextImageId = 0;

  function addMessage(text: string, name = 'アリス', extra: Record<string, unknown> = {}): void {
    tab.addMessage({
      from: Network.peerContext.userId,
      name,
      text,
      timestamp: nextTimestamp++,
      ...extra,
    });
  }

  function addImage(): string {
    return ImageStorage.instance.add(`test://vn-log/image-${nextImageId++}.png`).identifier;
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(VisualNovelBacklogComponent);
    fixture.componentRef.setInput('messageKindOptions', VN_MESSAGE_KINDS);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [VisualNovelBacklogComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    tab = ChatTabList.instance.addChatTab('テストタブ');
    TestBed.inject(VisualNovelPlaybackService).setChatTab(tab.identifier);
  });

  afterEach(() => {
    fixture?.destroy();
    tab?.destroy();
    vi.restoreAllMocks();
  });

  it('ログ行を本文とサフィックスに分離して保持すること', () => {
    addMessage('やあ 〔叫び・ゆれ〕');
    createComponent();

    const entry = component.entries()[0];
    expect(entry.text).toBe('やあ');
    expect(entry.suffix).toBe('〔叫び・ゆれ〕');
  });

  it('キーワードで本文と発言者名を絞り込めること', () => {
    addMessage('森の奥へ進む', 'アリス');
    addMessage('宿屋で休む', 'ボブ');
    createComponent();

    expect(component.filteredEntries()).toHaveLength(2);
    component.filter.set('宿屋');
    expect(component.filteredEntries()).toHaveLength(1);
    expect(component.filteredEntries()[0].message.name).toBe('ボブ');
    component.filter.set('アリス');
    expect(component.filteredEntries()).toHaveLength(1);
  });

  it('本文・演出・スロットを書き換えて保存できること', () => {
    addMessage('やあ 〔叫び〕', 'アリス', { imageIdentifier: addImage(), imagePos: 2 });
    createComponent();

    const entry = component.entries()[0];
    expect(entry.message.changeable).toBe(true);

    component.startEditEntry(entry);
    expect(component.editText()).toBe('やあ');
    expect(component.editShape()).toBe('shout');
    expect(component.editSlot()).toBe(2);

    component.editText.set('こんばんは');
    component.editShape.set('thought');
    component.editSlot.set(7);
    component.saveEditEntry();

    const message = TestBed.inject(VisualNovelPlaybackService).messages()[0];
    expect(message.text).toBe('こんばんは 〔もやもや〕');
    expect(message.imagePos).toBe(7);
    expect(message.fixd).toBe(true);
    expect(component.editingIndex()).toBe(-1);
  });

  it('反転を付け外しできること', () => {
    addMessage('ふりむく 〔反転〕', 'アリス', { imageIdentifier: addImage() });
    createComponent();

    component.startEditEntry(component.entries()[0]);
    expect(component.editFlipped()).toBe(true);
    component.editFlipped.set(false);
    component.saveEditEntry();

    expect(TestBed.inject(VisualNovelPlaybackService).messages()[0].text).toBe('ふりむく');
  });

  it('編集をキャンセルすると本文が変わらないこと', () => {
    addMessage('そのまま');
    createComponent();

    component.startEditEntry(component.entries()[0]);
    component.editText.set('書き換え');
    component.cancelEditEntry();

    expect(component.editingIndex()).toBe(-1);
    expect(TestBed.inject(VisualNovelPlaybackService).messages()[0].text).toBe('そのまま');
  });

  it('行クリックでジャンプ先の位置を通知すること', () => {
    addMessage('m1');
    addMessage('m2');
    createComponent();
    const jumped: number[] = [];
    component.jump.subscribe((index) => jumped.push(index));

    const rows = fixture.nativeElement.querySelectorAll('[data-vn-log-index]');
    rows[0].click();

    expect(jumped).toEqual([0]);
  });
});
