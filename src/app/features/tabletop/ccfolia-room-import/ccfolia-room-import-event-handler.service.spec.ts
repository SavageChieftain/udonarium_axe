import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { CcfoliaRoomImportService } from '@axe/application/tabletop/ccfolia-room-import.service';
import { emitCcfoliaRoomDropped } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CcfoliaRoomImportEventHandlerService } from '@axe/features/tabletop/ccfolia-room-import/ccfolia-room-import-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

const SUMMARY = {
  tableName: 'ココフォリアのルーム',
  tableCount: 1,
  panelCount: 2,
  pieceCount: 1,
  hiddenPanelCount: 0,
  missingImageCount: 0,
  skipped: { panels: 0, decks: 1, effects: 0 },
};

describe('CcfoliaRoomImportEventHandlerService', () => {
  let chatStub: { sendSystemMessage: ReturnType<typeof vi.fn> };
  let importAsync: ReturnType<typeof vi.fn>;
  let canEditTabletop: boolean;

  function setup(): void {
    chatStub = { sendSystemMessage: vi.fn() };
    importAsync = vi.fn().mockResolvedValue({ summary: SUMMARY, error: null });

    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(ChatMessageService, { useValue: chatStub });
    TestBed.overrideProvider(CcfoliaRoomImportService, { useValue: { importAsync } });
    TestBed.overrideProvider(RolePermissionService, {
      useValue: {
        get canEditTabletop() {
          return canEditTabletop;
        },
      },
    });
    TestBed.inject(CcfoliaRoomImportEventHandlerService);
  }

  beforeEach(() => {
    canEditTabletop = true;
  });

  afterEach(() => {
    const allObjects = ObjectStore.instance.getObjects();
    allObjects.forEach((object) => ObjectStore.instance.delete(object, false));
    ObjectStore.instance.clearDeleteHistory();
  });

  it('取り込み結果と取りこぼしをシステムメッセージで流す', async () => {
    setup();

    emitCcfoliaRoomDropped({ entries: {} });
    await vi.waitFor(() => expect(chatStub.sendSystemMessage).toHaveBeenCalled());

    const messages = chatStub.sendSystemMessage.mock.calls.map((call) => call[0] as string);
    expect(importAsync).toHaveBeenCalledOnce();
    expect(messages).toHaveLength(3);
    expect(messages[0]).toContain('feature.tabletop.ccfoliaImport.imported');
    expect(messages[1]).toContain('feature.tabletop.ccfoliaImport.skippedDecks');
    expect(messages[2]).toContain('feature.tabletop.ccfoliaImport.bgmNotice');
  });

  it('編集権限が無いロールでは取り込まない', async () => {
    canEditTabletop = false;
    setup();

    emitCcfoliaRoomDropped({ entries: {} });
    await vi.waitFor(() => expect(chatStub.sendSystemMessage).toHaveBeenCalled());

    expect(importAsync).not.toHaveBeenCalled();
    expect(chatStub.sendSystemMessage.mock.calls[0][0]).toContain('feature.tabletop.ccfoliaImport.errors.denied');
  });

  it('読めなかったときはエラーだけを伝える', async () => {
    setup();
    importAsync.mockResolvedValue({ summary: null, error: 'unrecognized' });

    emitCcfoliaRoomDropped({ entries: {} });
    await vi.waitFor(() => expect(chatStub.sendSystemMessage).toHaveBeenCalled());

    expect(chatStub.sendSystemMessage).toHaveBeenCalledOnce();
    expect(chatStub.sendSystemMessage.mock.calls[0][0]).toContain('feature.tabletop.ccfoliaImport.errors.unrecognized');
  });
});
