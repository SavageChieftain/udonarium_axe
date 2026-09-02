import { inject, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { setPortraitNameOf } from '@axe/domain/character/character-portrait';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataElement } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatMessageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, ChatMessageService],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should ...', inject([ChatMessageService], (service: ChatMessageService) => {
    expect(service).toBeTruthy();
  }));

  it('sendSystemMessageToMainTab routes to the first chat tab', inject(
    [ChatMessageService],
    (service: ChatMessageService) => {
      const mainTab = {} as ChatTab;
      const chatTabList = { chatTabs: [mainTab, {} as ChatTab] } as unknown as ChatTabList;
      vi.spyOn(TestBed.inject(ObjectStore), 'get').mockReturnValue(chatTabList as never);
      const toTabSpy = vi.spyOn(service, 'sendSystemMessageToTab').mockReturnValue(undefined as never);

      service.sendSystemMessageToMainTab('hello');

      expect(toTabSpy).toHaveBeenCalledWith(mainTab, 'hello', undefined);
    }
  ));

  describe('what a line records about who spoke it', () => {
    it('writes down the role the speaker was wearing at the time', () => {
      const service = TestBed.inject(ChatMessageService);
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.GameMaster;
      const chatTab = new ChatTab();
      chatTab.initialize();
      ObjectStore.instance.add(chatTab);

      const message = service.sendMessage(chatTab, 'では、判定を', null, PeerCursor.myCursor.identifier);

      expect(message.senderRole).toBe(PeerRole.GameMaster);
    });
  });

  describe('the portrait command at the end of a line', () => {
    let service: ChatMessageService;
    let character: GameCharacter;
    let chatTab: ChatTab;

    beforeEach(() => {
      service = TestBed.inject(ChatMessageService);
      const imageStorage = TestBed.inject(ImageStorage);
      for (const identifier of ['img-0', 'img-1', 'img-2']) imageStorage.add(identifier);

      character = GameCharacter.create('ヒロ', 1, '');
      const image = character.imageDataElement!;
      image.children[0].value = 'img-0';
      image.appendChild(DataElement.create('imageIdentifier', 'img-1', { type: 'image' }, ''));
      image.appendChild(DataElement.create('imageIdentifier', 'img-2', { type: 'image' }, ''));
      setPortraitNameOf(image.children[0], '通常');
      setPortraitNameOf(image.children[1], '笑顔');
      setPortraitNameOf(image.children[2], '怒り2');

      PeerCursor.createMyCursor();
      chatTab = new ChatTab();
      chatTab.initialize();
      ObjectStore.instance.add(chatTab);
    });

    function speak(text: string) {
      return service.sendMessage(chatTab, text, null, character.identifier);
    }

    it('switches to the portrait the name picks out and takes the command off the line', () => {
      const message = speak('こんにちは @笑顔');

      expect(message.imageIdentifier).toBe('img-1');
      expect(message.text).toBe('こんにちは ');
      expect(character.selectedPortraitIndex).toBe(1);
    });

    it('settles for the first name that starts the same way', () => {
      expect(speak('こんにちは @怒').imageIdentifier).toBe('img-2');
    });

    it('reads a name that ends in digits as a name, not a number', () => {
      expect(speak('こんにちは @怒り2').imageIdentifier).toBe('img-2');
      expect(character.selectedPortraitIndex).toBe(2);
    });

    it('remembers the portrait a number chose', () => {
      speak('こんにちは @2');

      expect(character.selectedPortraitIndex).toBe(1);
    });

    it('minds neither case nor width', () => {
      expect(speak('こんにちは ＠笑顔').imageIdentifier).toBe('img-1');
      expect(speak('こんにちは ＠２').imageIdentifier).toBe('img-1');
      expect(speak('こんにちは ＠ＨＩＤＥ').imageIdentifier).toBe('');
    });

    it('counts the number from the first portrait, not from zero', () => {
      expect(speak('こんにちは @1').imageIdentifier).toBe('img-0');
      expect(speak('こんにちは @3').imageIdentifier).toBe('img-2');
    });

    it('leaves a number no portrait sits at in the line it was typed on', () => {
      expect(speak('こんにちは @0').text).toBe('こんにちは @0');
      expect(speak('こんにちは @4').text).toBe('こんにちは @4');
    });

    it('hides on command', () => {
      expect(speak('こんにちは @hide').imageIdentifier).toBe('');
    });

    it('leaves a name nobody answers to in the line it was typed on', () => {
      const message = speak('こんにちは @存在しない');

      expect(message.text).toBe('こんにちは @存在しない');
      expect(character.selectedPortraitIndex).toBe(0);
    });

    it('remembers the portrait the command chose, not the one it started from', () => {
      speak('こんにちは @笑顔');

      expect(PeerCursor.myCursor.lastControlImageIdentifier).toBe('img-1');
      expect(PeerCursor.myCursor.lastControlImageIndex).toBe(1);
    });
  });
});
