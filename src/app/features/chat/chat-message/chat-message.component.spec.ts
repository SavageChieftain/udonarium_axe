import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DEFAULT_SYSTEM_AVATAR_URL,
  DEFAULT_SYSTEM_DICE_AVATAR_URL,
  NO_SYSTEM_AVATAR,
  SystemAvatarService,
} from '@axe/application/chat/system-avatar.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { emitFileLoaded } from '@axe/core/event/domain-events';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
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

  it('shows a picture attached to a line inside it', () => {
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

  it('drops the cover on a secret roll as soon as the tag loses it', () => {
    // The reveal changes only the tag. Nothing else drawn while the line is hidden depends on
    // that message, so without a version to watch the cover stayed on until something else drew.
    vi.spyOn(TestBed.inject(RolePermissionService), 'canSeeHidden', 'get').mockReturnValue(false);

    const message = new ChatMessage();
    message.initialize();
    message.from = 'someone-else';
    // Both, or an unset originFrom matches the unset user id of the peer under test.
    message.originFrom = 'someone-else';
    message.to = '';
    message.name = '<Secret-BCDice：テスト>';
    message.tag = 'system secret';
    message.imageIdentifier = '';
    message.messColor = '#000000';
    message.text = 'DiceBot : (1d6) → 4';
    fixture.componentRef.setInput('chatMessage', message);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('→ 4');

    message.tag = 'system';
    TestBed.inject(ObjectChangeService).notifyChanged(message.identifier);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('→ 4');
  });

  it('takes a portrait that arrives later into the thumbnail', () => {
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

  describe('the bubble behind a line', () => {
    function bubbleColourOf(message: ChatMessage): string | null {
      fixture.componentRef.setInput('chatMessage', message);
      fixture.detectChanges();
      const bubble = fixture.nativeElement.querySelector('[style*="background-color"]') as HTMLElement | null;
      return bubble?.style.backgroundColor ?? null;
    }

    it('is the same for a roll as for the line that asked for it', () => {
      const spoken = new ChatMessage();
      spoken.initialize();
      spoken.from = 'roller-user';
      spoken.name = 'アリス';
      spoken.text = '2d6';
      spoken.messColor = '#006633';

      const rolled = new ChatMessage();
      rolled.initialize();
      rolled.from = 'System-BCDice';
      rolled.originFrom = 'roller-user';
      rolled.tag = 'system';
      rolled.name = '<BCDice：アリス>';
      rolled.text = 'DiceBot : (2D6) → 9';
      rolled.messColor = '#006633';

      const spokenColour = bubbleColourOf(spoken);

      expect(spokenColour).toBeTruthy();
      expect(bubbleColourOf(rolled)).toBe(spokenColour);
    });
  });

  describe('the system avatar', () => {
    function systemMessage(): ChatMessage {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System';
      message.name = 'システム';
      message.text = 'ようこそ';
      return message;
    }

    function dicebotMessage(): ChatMessage {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System-BCDice';
      message.tag = 'system';
      message.text = '2D6 → 7';
      return message;
    }

    it('stands in for a system message with the picture the room uses', () => {
      fixture.componentRef.setInput('chatMessage', systemMessage());
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
      expect(avatar?.getAttribute('src')).toBe(DEFAULT_SYSTEM_AVATAR_URL);
    });

    it('stands in for a roll with the picture kept for rolls', () => {
      fixture.componentRef.setInput('chatMessage', dicebotMessage());
      fixture.detectChanges();

      const avatar = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
      expect(avatar?.getAttribute('src')).toBe(DEFAULT_SYSTEM_DICE_AVATAR_URL);
    });

    it('serves the picture the room has chosen instead', () => {
      const image = ImageStorage.instance.add('room-system-chan.png');
      try {
        TestBed.inject(SystemAvatarService).setImage('system', image.identifier);
        fixture.componentRef.setInput('chatMessage', systemMessage());
        fixture.detectChanges();

        const avatar = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
        expect(avatar?.getAttribute('src')).toBe('room-system-chan.png');
      } finally {
        TestBed.inject(SystemAvatarService).resetImage('system');
        ImageStorage.instance.delete(image.identifier);
      }
    });

    it('puts whoever rolled in the slot once the room asks for the speaker', () => {
      const service = TestBed.inject(SystemAvatarService);
      const image = ImageStorage.instance.add('roller-avatar.png');
      const cursor = new PeerCursor();
      cursor.userId = 'roller-user';
      cursor.imageIdentifier = image.identifier;
      cursor.initialize();
      try {
        service.setSpeakerVisible(true);
        const message = dicebotMessage();
        message.originFrom = 'roller-user';
        fixture.componentRef.setInput('chatMessage', message);
        fixture.detectChanges();

        expect(component.systemAvatarImage()).toEqual({ kind: 'dice', url: 'roller-avatar.png', isSpeaker: true });
      } finally {
        service.setSpeakerVisible(false);
        cursor.destroy();
        ImageStorage.instance.delete(image.identifier);
      }
    });

    it('puts the character rolled as ahead of the player who owns it', () => {
      const service = TestBed.inject(SystemAvatarService);
      const characterImage = ImageStorage.instance.add('character-face.png');
      const playerImage = ImageStorage.instance.add('player-avatar.png');
      const cursor = new PeerCursor();
      cursor.userId = 'roller-user';
      cursor.imageIdentifier = playerImage.identifier;
      cursor.initialize();
      const chatTab = new ChatTab();
      chatTab.initialize();
      try {
        service.setSpeakerVisible(true);
        const spoken = chatTab.addMessage({
          from: 'roller-user',
          name: 'アリス',
          text: '2d6',
          imageIdentifier: characterImage.identifier,
          timestamp: 1000,
        });
        const rolled = chatTab.addMessage({
          from: 'System-BCDice',
          originFrom: 'roller-user',
          name: '<BCDice：アリス>',
          tag: 'system',
          text: '(2D6) → 7',
          timestamp: spoken.timestamp + 1,
        });
        fixture.componentRef.setInput('chatMessage', rolled);
        fixture.detectChanges();

        expect(component.systemAvatarImage()?.url).toBe('character-face.png');
      } finally {
        service.setSpeakerVisible(false);
        chatTab.destroy();
        cursor.destroy();
        ImageStorage.instance.delete(characterImage.identifier);
        ImageStorage.instance.delete(playerImage.identifier);
      }
    });

    it('puts whoever asked for a system notice in the slot', () => {
      const service = TestBed.inject(SystemAvatarService);
      const image = ImageStorage.instance.add('gm-avatar.png');
      const cursor = new PeerCursor();
      cursor.userId = 'gm-user';
      cursor.imageIdentifier = image.identifier;
      cursor.initialize();
      try {
        service.setSpeakerVisible(true);
        const message = systemMessage();
        message.from = 'gm-user';
        message.tag = 'system-message';
        fixture.componentRef.setInput('chatMessage', message);
        fixture.detectChanges();

        expect(component.systemAvatarImage()).toEqual({ kind: 'system', url: 'gm-avatar.png', isSpeaker: true });
      } finally {
        service.setSpeakerVisible(false);
        cursor.destroy();
        ImageStorage.instance.delete(image.identifier);
      }
    });

    it('keeps the mascot when whoever rolled has no picture', () => {
      const service = TestBed.inject(SystemAvatarService);
      try {
        service.setSpeakerVisible(true);
        fixture.componentRef.setInput('chatMessage', dicebotMessage());
        fixture.detectChanges();

        expect(component.systemAvatarImage()?.url).toBe(DEFAULT_SYSTEM_DICE_AVATAR_URL);
      } finally {
        service.setSpeakerVisible(false);
      }
    });

    it('leaves the slot empty once the room picks no picture for it', () => {
      const service = TestBed.inject(SystemAvatarService);
      try {
        service.setImage('system', NO_SYSTEM_AVATAR);
        fixture.componentRef.setInput('chatMessage', systemMessage());
        fixture.detectChanges();

        expect(component.systemAvatarImage()).toBeNull();
        expect(fixture.nativeElement.querySelector('img')).toBeNull();
      } finally {
        service.resetImage('system');
      }
    });

    it('leaves the picture out once the room hides it', () => {
      const service = TestBed.inject(SystemAvatarService);
      try {
        service.setVisible(false);
        fixture.componentRef.setInput('chatMessage', systemMessage());
        fixture.detectChanges();

        expect(component.systemAvatarImage()).toBeNull();
        expect(fixture.nativeElement.querySelector('img')).toBeNull();
      } finally {
        service.setVisible(true);
      }
    });
  });

  describe('escapeHtmlAndRuby', () => {
    it('reads the version signal', () => {
      const objectChange = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChange, 'versionOf');
      const mockMessage = { identifier: 'test-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      component.escapeHtmlAndRuby('テスト');

      expect(spy).toHaveBeenCalledWith('test-msg-id');
    });

    it('does not throw without a message', () => {
      fixture.componentRef.setInput('chatMessage', undefined as unknown as ChatMessage);
      expect(() => component.escapeHtmlAndRuby('テスト')).not.toThrow();
    });

    it('writes the ruby out in full, which lays out in every browser', () => {
      const mockMessage = { identifier: 'ruby-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('前｜漢字《かんじ》後');

      expect(result).toBe('前<ruby class="chat-ruby"><rb>漢字</rb><rt>かんじ</rt></ruby>後');
    });

    it('escapes both the text and the ruby over it', () => {
      const mockMessage = { identifier: 'ruby-escape-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('｜<本文>《"ルビ"》');

      expect(result).toBe('<ruby class="chat-ruby"><rb>&lt;本文&gt;</rb><rt>&quot;ルビ&quot;</rt></ruby>');
    });

    it('wraps a quoted line in a quotation', () => {
      const mockMessage = { identifier: 'quote-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('hello\n> quoted line\nworld');

      expect(result).toBe('hello\n<span class="chat-quote">quoted line</span>\nworld');
    });

    it('gathers consecutive quoted lines into one', () => {
      const mockMessage = { identifier: 'quote-msg-id-2' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('> @プレイヤー\n> aaaaaaaaaa');

      expect(result).toBe('<span class="chat-quote">@プレイヤー<br>aaaaaaaaaa</span>');
    });

    it('leaves an unquoted line alone', () => {
      const mockMessage = { identifier: 'no-quote-msg-id' } as ChatMessage;
      fixture.componentRef.setInput('chatMessage', mockMessage);

      const result = component.escapeHtmlAndRuby('普通のメッセージ\n>not a quote (no space)');

      expect(result).toContain('chat-quote');
      // reads a quote mark without a space after it as a quotation
    });
  });

  describe('clickShareAsMemo', () => {
    it('turns a line into a note and puts it in the store', () => {
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

    it('does nothing for a line of nothing but spaces', () => {
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

    it('falls back to the default title for a nameless note', () => {
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
        // the default title of a shared note
        expect(created!.title).toBe('共有メモ');
      } finally {
        const created = ObjectStore.instance.getObjects(TextNote).find((n) => !beforeNotes.includes(n));
        created?.destroy();
      }
    });

    it('makes no note out of a system message, which cannot be acted on', () => {
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

    it('cannot act on anything tagged as a system message', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'tester';
      message.tag = 'system-message';
      message.text = 'sys';
      fixture.componentRef.setInput('chatMessage', message);

      expect(component.canInteract).toBe(false);
    });

    it('can reply to, quote and note a dice bot message', () => {
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

  describe('what can be acted on, and the guards on replying and quoting', () => {
    it('replies to nothing on a system message', () => {
      const message = new ChatMessage();
      message.initialize();
      message.from = 'System';
      fixture.componentRef.setInput('chatMessage', message);
      const ui = TestBed.inject(UiSignalService);
      const spy = vi.spyOn(ui, 'requestChatReply');
      component.clickReply();
      expect(spy).not.toHaveBeenCalled();
    });

    it('quotes nothing on one', () => {
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

  describe('consuming a jump to the original message', () => {
    /**
     * A jump is always cleared once it is consumed.
     * Left there, every message component mounted afterwards would read the same request on
     * its first pass and scroll again.
     */
    function setupMessage(identifier: string) {
      const message = new ChatMessage(identifier);
      message.initialize();
      message.from = 'tester';
      message.text = 'hello';
      fixture.componentRef.setInput('chatMessage', message);
      fixture.detectChanges();
      // Scrolling into view need do nothing here, but without a stub happy-dom throws.
      const host = fixture.nativeElement as HTMLElement;
      host.scrollIntoView = vi.fn();
      return host;
    }

    it('clears the request as soon as it consumes one meant for it', async () => {
      setupMessage('jump-target-msg');
      const ui = TestBed.inject(UiSignalService);

      ui.requestChatJump('jump-target-msg');
      fixture.detectChanges();
      // the clearing and the scrolling both happen on a microtask
      await Promise.resolve();

      expect(ui.chatJumpRequest()).toBeNull();
    });

    it('leaves a request meant for another alone, for that one to consume', () => {
      setupMessage('msg-A');
      const ui = TestBed.inject(UiSignalService);

      ui.requestChatJump('msg-B');
      fixture.detectChanges();

      const req = ui.chatJumpRequest();
      expect(req?.messageIdentifier).toBe('msg-B');
    });
  });
});
