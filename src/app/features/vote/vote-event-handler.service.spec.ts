import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitFinishVote, emitStartVote } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { VoteEventHandlerService } from '@axe/features/vote/vote-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VoteEventHandlerService', () => {
  let chatStub: { sendSystemMessageLastSendCharactor: ReturnType<typeof vi.fn> };
  let panelStub: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    PeerCursor.createMyCursor();
    chatStub = { sendSystemMessageLastSendCharactor: vi.fn() };
    panelStub = { open: vi.fn().mockReturnValue({}) };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(ChatMessageService, { useValue: chatStub });
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    TestBed.inject(VoteEventHandlerService);
  });

  afterEach(() => {
    const allObjects = ObjectStore.instance.getObjects();
    allObjects.forEach((obj) => ObjectStore.instance.delete(obj, false));
    ObjectStore.instance.clearDeleteHistory();
  });

  it('finishVote で system message を送る', () => {
    emitFinishVote({ text: '結果: 賛成 5 / 反対 2' });

    expect(chatStub.sendSystemMessageLastSendCharactor).toHaveBeenCalledWith('結果: 賛成 5 / 反対 2');
  });

  it('startVote: Vote が無い / chkToMe=false ならパネルを開かない', () => {
    emitStartVote();

    expect(panelStub.open).not.toHaveBeenCalled();
  });

  it('startVote: Vote.chkToMe() が true ならパネルを開く', () => {
    const vote = new Vote('Vote');
    vote.initialize();
    vote.chkToMe = () => true;

    emitStartVote();

    expect(panelStub.open).toHaveBeenCalledTimes(1);
    expect(panelStub.open.mock.calls[0][1].title).toBe('点呼/投票');
  });
});
