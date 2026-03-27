import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTachieImageComponent } from './chat-tachie-img.component';

describe('ChatTachieImageComponent', () => {
  let component: ChatTachieImageComponent;
  let fixture: ComponentFixture<ChatTachieImageComponent>;
  let objectChange: ObjectChangeService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTachieImageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTachieImageComponent);
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
    it('imageFileUrl_00がfileVersion()シグナルを読み取ること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(objectChange, 'fileVersion');

      // getterを呼び出すとfileVersion()が読まれる
      void component.imageFileUrl_00;

      expect(spy).toHaveBeenCalled();
    });

    it('chatTabゲッターがversionOf()シグナルを読み取ること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(objectChange, 'versionOf');

      void component.chatTab;

      expect(spy).toHaveBeenCalledWith(component.chatTabidentifier());
    });
  });
});
