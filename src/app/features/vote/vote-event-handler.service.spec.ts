import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { emitFinishVote } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { VoteEventHandlerService } from '@axe/features/vote/vote-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VoteEventHandlerService', () => {
  let chatStub: { sendSystemMessageAsLastSpeaker: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    PeerCursor.createMyCursor();
    chatStub = { sendSystemMessageAsLastSpeaker: vi.fn() };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(ChatMessageService, { useValue: chatStub });
    TestBed.inject(VoteEventHandlerService);
  });

  afterEach(() => {
    const allObjects = ObjectStore.instance.getObjects();
    allObjects.forEach((obj) => ObjectStore.instance.delete(obj, false));
    ObjectStore.instance.clearDeleteHistory();
  });

  it('投票の集計を選択肢ごとに訳した文にする', () => {
    emitFinishVote({
      isRollCall: false,
      voteTitle: '休憩する？',
      voted: 3,
      total: 3,
      abstained: 0,
      unanswered: 0,
      tally: [
        { choice: '賛成', count: 2 },
        { choice: '反対', count: 1 },
      ],
    });

    expect(chatStub.sendSystemMessageAsLastSpeaker).toHaveBeenCalledWith(
      '投票終了(休憩する？) 賛成：2 反対：1',
      undefined
    );
  });

  it('点呼の集計に棄権と未回答を添える', () => {
    emitFinishVote({
      isRollCall: true,
      voteTitle: '点呼',
      voted: 3,
      total: 5,
      abstained: 1,
      unanswered: 2,
      tally: [],
      chatTabIdentifier: 'tab-main',
    });

    expect(chatStub.sendSystemMessageAsLastSpeaker).toHaveBeenCalledWith('点呼終了(3/5) 棄権:1 未回答:2', 'tab-main');
  });

  it('棄権も未回答も無ければ集計だけを送る', () => {
    emitFinishVote({
      isRollCall: true,
      voteTitle: '点呼',
      voted: 2,
      total: 2,
      abstained: 0,
      unanswered: 0,
      tally: [],
      chatTabIdentifier: 'tab-main',
    });

    expect(chatStub.sendSystemMessageAsLastSpeaker).toHaveBeenCalledWith('点呼終了(2/2)', 'tab-main');
  });
});
