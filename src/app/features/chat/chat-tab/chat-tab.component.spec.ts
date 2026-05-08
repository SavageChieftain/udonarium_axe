import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { emitMessageAdded } from '@axe/domain/domain-events';
import { ChatTabComponent } from '@axe/features/chat/chat-tab/chat-tab.component';
import { ObjectChangeService, type WritingMessageEvent } from '@axe/shared/sync/object-change.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatTabComponent', () => {
  let component: ChatTabComponent;
  let fixture: ComponentFixture<ChatTabComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTabComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTabComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    it('scrollablePanelが存在する場合はresetMessagesが同期的に呼ばれること', () => {
      const panelService = TestBed.inject(PanelService);
      const mockPanel = document.createElement('div');
      Object.defineProperty(mockPanel, 'clientHeight', { value: 400 });
      panelService.scrollablePanel = mockPanel as unknown as HTMLDivElement;

      const chatTab = new ChatTab();
      chatTab.initialize();

      const spy = vi.spyOn(component, 'resetMessages' as never);
      fixture.componentRef.setInput('chatTab', chatTab);
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
    });

    it('scrollablePanelがnullの場合はresetMessagesがマイクロタスクで呼ばれること', async () => {
      const panelService = TestBed.inject(PanelService);
      const mockPanel = document.createElement('div');
      panelService.scrollablePanel = mockPanel as unknown as HTMLDivElement;
      fixture.detectChanges();

      panelService.scrollablePanel = null!;

      const chatTab = new ChatTab();
      chatTab.initialize();

      const spy = vi.spyOn(component, 'resetMessages' as never);
      fixture.componentRef.setInput('chatTab', chatTab);
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(spy).toHaveBeenCalled();
    });
  });

  it('ChangeDetectorRefを使用していないこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  it('chatTab が null の場合でも chatMessages getter がエラーをスローしないこと', () => {
    fixture.componentRef.setInput('chatTab', null);
    expect(() => {
      const _msgs = component.chatMessages;
    }).not.toThrow();
  });

  describe('messageAdded$ による bottomIndex 更新', () => {
    let chatTab: ChatTab;
    let panelService: PanelService;
    // private フィールドへのアクセスを型安全に行うためのヘルパー
    type InternalComponent = { bottomIndex: number };
    const internal = () => component as unknown as InternalComponent;

    beforeEach(() => {
      panelService = TestBed.inject(PanelService);
      const mockPanel = document.createElement('div');
      Object.defineProperty(mockPanel, 'clientHeight', { value: 400 });
      panelService.scrollablePanel = mockPanel as unknown as HTMLDivElement;

      chatTab = new ChatTab();
      chatTab.initialize();
      fixture.componentRef.setInput('chatTab', chatTab);
      fixture.detectChanges();
    });

    it('ボトムにいる時に新着メッセージが届いたら bottomIndex が拡張されること', () => {
      // Arrange: まずメッセージを1件追加して bottomIndex = 0 にする
      const msg0 = new ChatMessage();
      msg0.initialize();
      chatTab.appendChild(msg0);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: msg0.identifier });
      // bottomIndex は 0 (length-1=0 への拡張) になっているはず

      // Act: 2件目を追加
      const msg1 = new ChatMessage();
      msg1.initialize();
      chatTab.appendChild(msg1);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: msg1.identifier });

      // Assert: bottomIndex が 1(新着のインデックス) に拡張されていること
      expect(internal().bottomIndex).toBe(1);
    });

    it('スクロールアップ中は新着メッセージで bottomIndex を変えないこと', () => {
      // Arrange: 10 件追加して bottomIndex を 9 にする
      for (let i = 0; i < 10; i++) {
        const m = new ChatMessage();
        m.initialize();
        chatTab.appendChild(m);
        emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: m.identifier });
      }
      // ユーザーがスクロールアップしたと仮定して bottomIndex を中間に下げる
      internal().bottomIndex = 4;

      // Act: 新着メッセージ
      const newMsg = new ChatMessage();
      newMsg.initialize();
      chatTab.appendChild(newMsg);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: newMsg.identifier });

      // Assert: bottomIndex は変わらない
      expect(internal().bottomIndex).toBe(4);
    });

    it('topTimestamp より古いタイムスタンプのメッセージでも needUpdate が true になること', () => {
      // Arrange: timestamp=1000 のメッセージを追加し chatMessages getter を実行して topTimestamp を確定させる
      type InternalFull = { bottomIndex: number; needUpdate: boolean; topTimestamp: number };
      const internalFull = () => component as unknown as InternalFull;

      const msg0 = new ChatMessage();
      msg0.initialize();
      msg0.setAttribute('timestamp', 1000);
      chatTab.appendChild(msg0);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: msg0.identifier });

      // topTimestamp を 1000 に確定させる
      const _ignored = component.chatMessages;
      expect(internalFull().topTimestamp).toBe(1000);
      internalFull().needUpdate = false; // getter で false になっているはずだが明示的に確認

      // Act: timestamp=500 (< topTimestamp=1000) のメッセージを追加
      const msg1 = new ChatMessage();
      msg1.initialize();
      msg1.setAttribute('timestamp', 500);
      chatTab.appendChild(msg1);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: msg1.identifier });

      // Assert: タイムスタンプが古くても needUpdate = true になること (修正前は false のまま)
      expect(internalFull().needUpdate).toBe(true);
    });

    it('topTimestamp より古いタイムスタンプでもボトムにいる場合は bottomIndex が拡張されること', () => {
      // Arrange: timestamp=1000 のメッセージを追加し bottomIndex=0 / topTimestamp=1000 を確定させる
      type InternalFull = { bottomIndex: number; topTimestamp: number };
      const internalFull = () => component as unknown as InternalFull;

      const msg0 = new ChatMessage();
      msg0.initialize();
      msg0.setAttribute('timestamp', 1000);
      chatTab.appendChild(msg0);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: msg0.identifier });

      const _ignored = component.chatMessages;
      expect(internalFull().topTimestamp).toBe(1000);
      expect(internalFull().bottomIndex).toBe(0);

      // Act: timestamp=500 (< topTimestamp=1000) のメッセージを追加
      const msg1 = new ChatMessage();
      msg1.initialize();
      msg1.setAttribute('timestamp', 500);
      chatTab.appendChild(msg1);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: msg1.identifier });

      // Assert: ボトムにいるため bottomIndex が 1 に拡張されること (修正前は 0 のまま)
      expect(internalFull().bottomIndex).toBe(1);
    });
  });

  describe('入力中バブル', () => {
    let chatTab: ChatTab;

    beforeEach(() => {
      const panelService = TestBed.inject(PanelService);
      const mockPanel = document.createElement('div');
      Object.defineProperty(mockPanel, 'clientHeight', { value: 400 });
      panelService.scrollablePanel = mockPanel as unknown as HTMLDivElement;

      chatTab = new ChatTab();
      chatTab.initialize();
      fixture.componentRef.setInput('chatTab', chatTab);
      fixture.detectChanges();
    });

    it('WRITING_A_MESSAGE_DETAIL の話者をチャットログ末尾に表示すること', () => {
      const speaker = GameCharacter.create('入力中の冒険者', 1, '');
      const objectChange = TestBed.inject(ObjectChangeService) as unknown as {
        _writingMessage$: { emit(event: WritingMessageEvent): void };
      };

      objectChange._writingMessage$.emit({
        tabIdentifier: chatTab.identifier,
        sendFrom: 'remote-peer',
        isSendFromSelf: false,
        speakerIdentifier: speaker.identifier,
      });
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.writing-speaker-name') as HTMLElement;
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toContain('入力中の冒険者');
    });

    it('メッセージ到着時に同じ話者の入力中バブルを消すこと', () => {
      const speaker = GameCharacter.create('発言者', 1, '');
      const objectChange = TestBed.inject(ObjectChangeService) as unknown as {
        _writingMessage$: { emit(event: WritingMessageEvent): void };
      };

      objectChange._writingMessage$.emit({
        tabIdentifier: chatTab.identifier,
        sendFrom: 'remote-peer',
        isSendFromSelf: false,
        speakerIdentifier: speaker.identifier,
      });

      const message = new ChatMessage();
      message.initialize();
      message.sendFrom = speaker.identifier;
      chatTab.appendChild(message);
      emitMessageAdded({ tabIdentifier: chatTab.identifier, messageIdentifier: message.identifier });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.writing-speaker-name')).toBeNull();
    });
  });
});
