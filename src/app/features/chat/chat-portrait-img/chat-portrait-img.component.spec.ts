import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatPortraitImageComponent } from '@axe/features/chat/chat-portrait-img/chat-portrait-img.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatPortraitImageComponent', () => {
  let component: ChatPortraitImageComponent;
  let fixture: ComponentFixture<ChatPortraitImageComponent>;
  let objectChange: ObjectChangeService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatPortraitImageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  let chatTab: ChatTab;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatPortraitImageComponent);
    component = fixture.componentInstance;
    objectChange = TestBed.inject(ObjectChangeService);

    chatTab = ChatTabList.instance.addChatTab('立ち絵テスト');
    fixture.componentRef.setInput('chatTabidentifier', chatTab.identifier);
  });

  afterEach(() => {
    ChatTabList.instance.removeChild(chatTab);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('listening', () => {
    it('reads the file version for the portraits', () => {
      const spy = vi.spyOn(objectChange, 'fileVersion');
      fixture.detectChanges();
      void component.portraitSlots();
      expect(spy).toHaveBeenCalled();
    });

    it('reads the version signal for the tab', () => {
      const spy = vi.spyOn(objectChange, 'versionOf');
      fixture.detectChanges();
      void component.chatTab;
      expect(spy).toHaveBeenCalledWith(component.chatTabidentifier());
    });
  });

  describe('in-window band', () => {
    let imageIdentifier: string;

    beforeEach(() => {
      imageIdentifier = ImageStorage.instance.add('portrait-band.png').identifier;
      const identifiers = chatTab.imageIdentifier.slice();
      identifiers[0] = imageIdentifier;
      chatTab.imageIdentifier = identifiers;
      chatTab.imageDispFlag[0] = true;
      ChatTabList.instance.isKeepPortraitOutWindow = true;
      ChatTabList.instance.portraitHeight = 200;
      fixture.detectChanges();
    });

    afterEach(() => {
      ImageStorage.instance.delete(imageIdentifier);
      ChatTabList.instance.isPortraitInWindow = false;
      ChatTabList.instance.isKeepPortraitOutWindow = false;
    });

    it('reserves no room while the portraits float outside the window', async () => {
      ChatTabList.instance.isPortraitInWindow = false;
      await Promise.resolve();
      expect(component.bandHeight()).toBe(0);
      expect(component.portraitYPos()).toBe(-228);
    });

    it('reserves the portrait height once they move into the window', async () => {
      ChatTabList.instance.isPortraitInWindow = true;
      await Promise.resolve();
      expect(component.bandHeight()).toBe(200);
      expect(component.portraitYPos()).toBe(0);
    });

    it('reserves nothing when every slot is hidden', async () => {
      ChatTabList.instance.isPortraitInWindow = true;
      chatTab.hidePortraitPos(0);
      await Promise.resolve();
      expect(component.bandHeight()).toBe(0);
    });
  });
});
