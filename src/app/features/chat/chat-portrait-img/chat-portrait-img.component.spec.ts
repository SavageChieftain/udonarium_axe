import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
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

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatPortraitImageComponent);
    component = fixture.componentInstance;
    objectChange = TestBed.inject(ObjectChangeService);

    const chatTabList = ChatTabList.instance;
    const chatTab = chatTabList.chatTabs[0] ?? chatTabList.addChatTab('テスト');
    fixture.componentRef.setInput('chatTabidentifier', chatTab.identifier);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('イベントリスナー', () => {
    it('portraitSlotsがfileVersion()シグナルを読み取ること', () => {
      const spy = vi.spyOn(objectChange, 'fileVersion');
      fixture.detectChanges();
      void component.portraitSlots();
      expect(spy).toHaveBeenCalled();
    });

    it('chatTabゲッターがversionOf()シグナルを読み取ること', () => {
      const spy = vi.spyOn(objectChange, 'versionOf');
      fixture.detectChanges();
      void component.chatTab;
      expect(spy).toHaveBeenCalledWith(component.chatTabidentifier());
    });
  });
});
