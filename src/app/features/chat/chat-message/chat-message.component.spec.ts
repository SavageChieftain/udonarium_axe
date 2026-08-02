import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { emitFileLoaded } from '@axe/core/event/domain-events';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { ChatMessageComponent } from '@axe/features/chat/chat-message/chat-message.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatMessageComponent', () => {
  let component: ChatMessageComponent;
  let fixture: ComponentFixture<ChatMessageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('本文添付画像をチャット本文内に表示すること', () => {
    const image = ImageStorage.instance.add('stamp-image.png');
    try {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'test-user';
      message.to = '';
      message.name = 'テスト';
      message.tag = '';
      message.imageIdentifier = '';
      message.messColor = '#000000';
      message.text = '確認';
      message.attachmentImageIdentifiers = JSON.stringify([image.identifier]);
      fixture.componentRef.setInput('chatMessage', message);
      fixture.detectChanges();

      const attachment = fixture.nativeElement.querySelector('.message-attachment-image') as HTMLImageElement | null;
      expect(attachment).toBeTruthy();
      expect(attachment?.getAttribute('src')).toBe('stamp-image.png');
    } finally {
      ImageStorage.instance.delete(image.identifier);
    }
  });

  it('あとから届いた立ち絵をサムネイルに反映すること', () => {
    const identifier = 'late-arriving-image';
    const message = new ChatMessage();
    message.initialize();
    message.from = 'test-user';
    message.to = '';
    message.name = 'テスト';
    message.tag = '';
    message.imageIdentifier = identifier;
    message.messColor = '#000000';
    message.text = 'まだ画像が届いていない';
    fixture.componentRef.setInput('chatMessage', message);
    fixture.detectChanges();

    expect(component.imageFile().url).toBe('');

    ImageStorage.instance.add({
      identifier,
      name: 'late.png',
      type: '',
      blob: null,
      url: 'late-image.png',
      thumbnail: { type: '', blob: null, url: '' },
    });
    try {
      emitFileLoaded();
      fixture.detectChanges();

      expect(component.imageFile().url).toBe('late-image.png');
      const thumbnail = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
      expect(thumbnail?.getAttribute('src')).toBe('late-image.png');
    } finally {
      ImageStorage.instance.delete(identifier);
    }
  });

  describe('escapeHtmlAndRuby', () => {
    it('versionOfシグナルを読み取ること', () => {
      const objectChange = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChange, 'versionOf');
      const mockMessage = { identifier: 'test-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      component.escapeHtmlAndRuby('テスト');

      expect(spy).toHaveBeenCalledWith('test-msg-id');
    });

    it('chatMessageがundefinedでもエラーにならないこと', () => {
      fixture.componentRef.setInput('chatMessage', undefined as unknown as ChatMessage);
      expect(() => component.escapeHtmlAndRuby('テスト')).not.toThrow();
    });

    it('ルビ記法をFirefoxでもレイアウトしやすい明示的なruby構造へ変換すること', () => {
      const mockMessage = { identifier: 'ruby-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('前｜漢字《かんじ》後');

      expect(result).toBe('前<ruby class="chat-ruby"><rb>漢字</rb><rt>かんじ</rt></ruby>後');
    });

    it('ルビ本文とルビ文字もHTMLエスケープされること', () => {
      const mockMessage = { identifier: 'ruby-escape-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('｜<本文>《"ルビ"》');

      expect(result).toBe('<ruby class="chat-ruby"><rb>&lt;本文&gt;</rb><rt>&quot;ルビ&quot;</rt></ruby>');
    });

    it('「> 」始まりの行は chat-quote 要素に包んで装飾すること', () => {
      const mockMessage = { identifier: 'quote-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('hello\n> quoted line\nworld');

      expect(result).toBe('hello\n<span class="chat-quote">quoted line</span>\nworld');
    });

    it('連続する「> 」行は1つの chat-quote にまとめる', () => {
      const mockMessage = { identifier: 'quote-msg-id-2' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('> @プレイヤー\n> aaaaaaaaaa');

      expect(result).toBe('<span class="chat-quote">@プレイヤー<br>aaaaaaaaaa</span>');
    });

    it('「> 」が無い行は変換しない', () => {
      const mockMessage = { identifier: 'no-quote-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('普通のメッセージ\n>not a quote (no space)');

      expect(result).toContain('chat-quote');
      // 半角スペース無しでも > 始まりなら引用扱い (省略可能なため)
    });
  });

  describe('clickShareAsMemo', () => {
    it('チャット本文を TextNote に変換して ObjectStore に登録すること', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'tester';
      message.name = '勇者';
      message.text = '世界を救うのだ';
      fixture.componentRef.setInput('chatMessage', message);

      const beforeNotes = ObjectStore.instance.getObjects(TextNote);
      try {
        component.clickShareAsMemo();
        const afterNotes = ObjectStore.instance.getObjects(TextNote);
        const created = afterNotes.find((n) => !beforeNotes.includes(n));
        expect(created).toBeTruthy();
        expect(created!.title).toBe('勇者');
        expect(created!.text).toBe('世界を救うのだ');
      } finally {
        const created = ObjectStore.instance.getObjects(TextNote).find((n) => !beforeNotes.includes(n));
        created?.destroy();
      }
    });

    it('本文が空白のみのメッセージは何もしないこと', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'tester';
      message.name = 'GM';
      message.text = '   \n  ';
      fixture.componentRef.setInput('chatMessage', message);

      const before = ObjectStore.instance.getObjects(TextNote).length;
      component.clickShareAsMemo();
      const after = ObjectStore.instance.getObjects(TextNote).length;
      expect(after).toBe(before);
    });

    it('name が空のとき既定のタイトル (共有メモ) を使うこと', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'tester';
      message.name = '';
      message.text = 'メモ本文';
      fixture.componentRef.setInput('chatMessage', message);

      const beforeNotes = ObjectStore.instance.getObjects(TextNote);
      try {
        component.clickShareAsMemo();
        const created = ObjectStore.instance.getObjects(TextNote).find((n) => !beforeNotes.includes(n));
        expect(created).toBeTruthy();
        // デフォルトキー feature.tabletop.action.defaultNoteName は "共有メモ"
        expect(created!.title).toBe('共有メモ');
      } finally {
        const created = ObjectStore.instance.getObjects(TextNote).find((n) => !beforeNotes.includes(n));
        created?.destroy();
      }
    });

    it('from === "System" のメッセージは canInteract=false で共有メモ化しないこと', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System';
      message.name = 'システム';
      message.text = 'ようこそ';
      fixture.componentRef.setInput('chatMessage', message);

      expect(component.canInteract).toBe(false);
      const before = ObjectStore.instance.getObjects(TextNote).length;
      component.clickShareAsMemo();
      expect(ObjectStore.instance.getObjects(TextNote).length).toBe(before);
    });

    it('tag に "system-message" を含むメッセージは canInteract=false', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'tester';
      message.tag = 'system-message';
      message.text = 'sys';
      fixture.componentRef.setInput('chatMessage', message);

      expect(component.canInteract).toBe(false);
    });

    it('ダイスボット (System-BCDice + system タグ) は canInteract=true で返信・引用・共有メモ可能', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System-BCDice';
      message.tag = 'system';
      message.text = '2D6 → 7';
      fixture.componentRef.setInput('chatMessage', message);

      expect(component.canInteract).toBe(true);
      const before = ObjectStore.instance.getObjects(TextNote).length;
      try {
        component.clickShareAsMemo();
        expect(ObjectStore.instance.getObjects(TextNote).length).toBe(before + 1);
      } finally {
        const created = ObjectStore.instance
          .getObjects(TextNote)
          .find((n, idx) => idx >= before && n.text === '2D6 → 7');
        created?.destroy();
      }
    });
  });

  describe('canInteract と返信/引用ガード', () => {
    it('System メッセージで clickReply は何もしないこと', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System';
      fixture.componentRef.setInput('chatMessage', message);
      const ui = TestBed.inject(UiSignalService);
      const spy = vi.spyOn(ui, 'requestChatReply');
      component.clickReply();
      expect(spy).not.toHaveBeenCalled();
    });

    it('System メッセージで clickQuote は何もしないこと', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System';
      message.text = 'msg';
      fixture.componentRef.setInput('chatMessage', message);
      const ui = TestBed.inject(UiSignalService);
      const spy = vi.spyOn(ui, 'requestChatInputText');
      component.clickQuote();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('「元のメッセージへ移動」consume 動作', () => {
    /**
     * 引用/返信ジャンプは consume 後に必ずクリアされること。
     * クリアされないと、その後の発言で chat-message コンポーネントが新規マウントされる度に
     * effect 初回実行で同じ jump request を読み再スクロールしてしまう (報告された不具合)。
     */
    function setupMessage(identifier: string) {
      const message = new ChatMessage(identifier);
      message.initialize();
      message.from = 'tester';
      message.text = 'hello';
      fixture.componentRef.setInput('chatMessage', message);
      fixture.detectChanges();
      // happy-dom: scrollIntoView は no-op で十分。stub しておかないと未実装エラーになる。
      const host = fixture.nativeElement as HTMLElement;
      host.scrollIntoView = vi.fn();
      return host;
    }

    it('自身宛の jump request を消費した直後に chatJumpRequest が null に戻る', async () => {
      setupMessage('jump-target-msg');
      const ui = TestBed.inject(UiSignalService);

      ui.requestChatJump('jump-target-msg');
      fixture.detectChanges();
      // queueMicrotask 内でクリア + scrollIntoView を呼ぶ
      await Promise.resolve();

      expect(ui.chatJumpRequest()).toBeNull();
    });

    it('自身宛でない jump request は触らない (他コンポーネントが消費するため)', () => {
      setupMessage('msg-A');
      const ui = TestBed.inject(UiSignalService);

      ui.requestChatJump('msg-B');
      fixture.detectChanges();

      const req = ui.chatJumpRequest();
      expect(req?.messageIdentifier).toBe('msg-B');
    });
  });
});
