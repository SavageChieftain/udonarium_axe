import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { toStageResetAt } from '@axe/domain/visual-novel/vn-portrait-position';
import { VnStage } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelSceneService } from '@axe/features/visual-novel/visual-novel-scene.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelSceneService', () => {
  let service: VisualNovelSceneService;
  let stage: VnStage;
  let imageIdentifier: string;
  let objectChange: ObjectChangeService;

  function becomeGameMaster(): void {
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    stage = ObjectStore.instance.get<VnStage>('VnStage') ?? new VnStage('VnStage');
    stage.initialize();
    stage.backgroundImageIdentifier = '';
    stage.transition = 'fade';
    imageIdentifier = ImageStorage.instance.add('test://vn/background.png').identifier;
    service = TestBed.inject(VisualNovelSceneService);
    objectChange = TestBed.inject(ObjectChangeService);
  });

  afterEach(() => {
    PeerCursor.myCursor.role = PeerRole.Player;
  });

  it('draws no backdrop while there is none', () => {
    expect(service.hasBackground()).toBe(false);
    expect(service.backgroundUrl()).toBe('');
  });

  it('lets the game master change the backdrop and run the transition', () => {
    becomeGameMaster();
    expect(service.canDirect()).toBe(true);
    const before = service.transitionTrigger();

    stage.setBackground(imageIdentifier, 'wipe');
    objectChange.notifyChanged(stage.identifier);

    expect(service.hasBackground()).toBe(true);
    expect(service.backgroundUrl().length).toBeGreaterThan(0);
    expect(service.transition()).toBe('wipe');
    expect(service.transitionTrigger()).toBe(before + 1);
  });

  it('takes no backdrop change from anybody else', () => {
    PeerCursor.myCursor.role = PeerRole.Player;
    stage.backgroundImageIdentifier = imageIdentifier;

    service.clearBackground();
    service.setTransition('none');

    expect(stage.backgroundImageIdentifier).toBe(imageIdentifier);
    expect(stage.transition).toBe('fade');
  });

  it('lets the game master take it away', () => {
    becomeGameMaster();
    stage.backgroundImageIdentifier = imageIdentifier;
    objectChange.notifyChanged(stage.identifier);

    service.clearBackground();

    expect(stage.backgroundImageIdentifier).toBe('');
  });
  describe('clearing the portraits', () => {
    function tab(): ChatTab {
      const chatTab = new ChatTab();
      chatTab.initialize();
      chatTab.name = 'メイン';
      return chatTab;
    }

    it('takes no clearing from anybody else', () => {
      PeerCursor.myCursor.role = PeerRole.Player;
      const chatTab = tab();

      service.resetStage(chatTab);

      expect(toStageResetAt(chatTab.vnPortraitResetAt)).toBe(0);
      expect(chatTab.chatMessages).toHaveLength(0);
    });

    it('draws the line at the notice it leaves in the log', () => {
      becomeGameMaster();
      const chatTab = tab();

      service.resetStage(chatTab);

      expect(chatTab.chatMessages).toHaveLength(1);
      const notice = chatTab.chatMessages[0];
      expect(notice.isSystemMessage).toBe(true);
      expect(toStageResetAt(chatTab.vnPortraitResetAt)).toBe(notice.timestamp);
    });

    it('leaves what was already said where it was', () => {
      becomeGameMaster();
      const chatTab = tab();
      chatTab.addMessage({ from: 'alice', name: 'アリス', text: 'やあ', timestamp: 1000 });

      service.resetStage(chatTab);

      expect(chatTab.chatMessages).toHaveLength(2);
      expect(chatTab.chatMessages[0].text).toBe('やあ');
      // The line has to fall after the last thing said, or that line would survive it.
      expect(toStageResetAt(chatTab.vnPortraitResetAt)).toBeGreaterThan(1000);
    });
  });
});
