import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { ChatTabSettingComponent } from '@axe/features/chat/chat-tab-setting/chat-tab-setting.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatTabSettingComponent', () => {
  let component: ChatTabSettingComponent;
  let fixture: ComponentFixture<ChatTabSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTabSettingComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTabSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectedTabがnullの場合', () => {
    it('selectedTabがnullでもdetectChangesでクラッシュしないこと', () => {
      component.selectedTab.set(null);
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('tabNameが空文字を返すこと', () => {
      component.selectedTab.set(null);
      expect(component.tabName).toBe('');
    });
  });

  it('OnPushコンポーネントでChangeDetectorRefが注入されていること', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(ChatTabSettingComponent);
  });

  describe('ログ保存は権限によらず行える（性善説）', () => {
    let store: ObjectStore;
    let saveData: SaveDataService;

    beforeEach(() => {
      store = ObjectStore.instance;
      saveData = TestBed.inject(SaveDataService);
    });

    afterEach(() => {
      store.getObjects().forEach((obj) => store.delete(obj, false));
      store.clearDeleteHistory();
      PeerCursor.myCursor = null!;
      vi.restoreAllMocks();
    });

    it('見学が閲覧不可タブでも単独ログを保存できる', () => {
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.Guest;
      const tab = new ChatTab();
      tab.initialize();
      tab.guestCanView = false;
      component.selectedTab.set(tab);
      const spy = vi.spyOn(saveData, 'saveHtmlChatLog').mockResolvedValue(undefined);

      component.saveLog();

      expect(spy).toHaveBeenCalledOnce();
    });

    it('見学でも全タブ保存を実行でき、閲覧フィルタせず全タブを渡す', () => {
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.Guest;
      const spy = vi.spyOn(saveData, 'saveHtmlChatLogAll').mockResolvedValue(undefined);

      component.saveAllLog();

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][1]).toEqual(component.chatTabs);
    });
  });

  describe('閲覧・発言の権限は見学が編集できない', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = ObjectStore.instance;
    });

    afterEach(() => {
      store.getObjects().forEach((obj) => store.delete(obj, false));
      store.clearDeleteHistory();
      (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
      PeerCursor.myCursor = null!;
    });

    it('編集可能なタブでも見学では canEditPermission が false になる', () => {
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.Guest;
      const tab = ChatTabList.instance.addChatTab('test');
      component.selectedTab.set(tab);

      expect(component.canEditPermission).toBe(false);
    });

    it('見学が setPerm を呼んでも権限フラグが変更されない', () => {
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.Guest;
      const tab = ChatTabList.instance.addChatTab('test');
      tab.guestCanSpeak = false;
      component.selectedTab.set(tab);

      component.setPerm('guestCanSpeak', true);

      expect(tab.guestCanSpeak).toBe(false);
    });

    it('プレイヤーは setPerm で権限フラグを変更できる', () => {
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.Player;
      const tab = ChatTabList.instance.addChatTab('test');
      tab.guestCanSpeak = false;
      component.selectedTab.set(tab);

      expect(component.canEditPermission).toBe(true);

      component.setPerm('guestCanSpeak', true);

      expect(tab.guestCanSpeak).toBe(true);
    });
  });

  describe('システムタブは消せない', () => {
    it('選んでいても削除しないこと', () => {
      const list = ChatTabList.instance;
      list.addChatTab('メイン');
      const system = list.ensureSystemTab();
      component.selectedTab.set(system);
      component.allowDeleteTab = true;

      component.delete();

      // 消せると、入退室の知らせが会話のタブへ戻ってくる。
      expect(component.isDeletable).toBe(false);
      expect(list.chatTabs.some((tab) => tab.isSystemTab)).toBe(true);
    });

    it('ふつうのタブは今までどおり消せること', () => {
      const list = ChatTabList.instance;
      const main = list.addChatTab('メイン');
      list.ensureSystemTab();
      component.selectedTab.set(main);
      component.allowDeleteTab = true;

      expect(component.isDeletable).toBe(true);
      component.delete();

      expect(ObjectStore.instance.get(main.identifier)).toBeNull();
    });
  });
});
