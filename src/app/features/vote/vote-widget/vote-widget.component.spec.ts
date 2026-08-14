import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { emitStartVote } from '@axe/core/event/domain-events';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { VoteWidgetComponent } from '@axe/features/vote/vote-widget/vote-widget.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

interface ComponentInternals {
  isCollapsed: { set: (value: boolean) => void };
  toggleCollapsed: () => void;
  abstain: () => void;
  voteSend: (choice: string) => void;
  finishByChair: () => void;
}

describe('VoteWidgetComponent', () => {
  let fixture: ComponentFixture<VoteWidgetComponent>;
  let internals: ComponentInternals;
  let chatStub: { sendSystemMessageAsLastSpeaker: ReturnType<typeof vi.fn> };
  let vote: Vote;
  let myCursor: PeerCursor;

  function widget(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="vote-widget"]');
  }

  function create() {
    fixture = TestBed.createComponent(VoteWidgetComponent);
    internals = fixture.componentInstance as unknown as ComponentInternals;
    fixture.detectChanges();
  }

  function notifyVoteChanged() {
    objectChanged$.emit({ identifier: vote.identifier, aliasName: vote.aliasName, isSendFromSelf: false });
  }

  beforeEach(async () => {
    localStorage.clear();
    ObjectStore.instance.clearDeleteHistory();
    chatStub = { sendSystemMessageAsLastSpeaker: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [VoteWidgetComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(ChatMessageService, { useValue: chatStub });

    myCursor = PeerCursor.createMyCursor();
    myCursor.peerId = 'my-peer-id';
    vote = new Vote('Vote');
    vote.initialize();
    vote.initTimeStamp = 1;
    vote.voteId = 1;
    vote.voteTitle = '点呼';
    vote.isRollCall = true;
    vote.choices = ['準備完了'];
    vote.chairId = 'chair-peer-id';
    vote.targetPeerId = ['my-peer-id'];
    vote.chatTabIdentifier = 'tab-main';
    vi.spyOn(PeerCursor, 'findByPeerId').mockImplementation((peerId: string) =>
      peerId === 'my-peer-id' ? myCursor : null!
    );
  });

  afterEach(() => {
    const allObjects = ObjectStore.instance.getObjects();
    allObjects.forEach((obj) => ObjectStore.instance.delete(obj, false));
    ObjectStore.instance.clearDeleteHistory();
    PeerCursor.myCursor = null!;
    vi.restoreAllMocks();
  });

  it('対象者には投票ウィジェットを出す', () => {
    create();

    expect(widget()).not.toBeNull();
  });

  it('対象でも議長でもなければ何も描画しない', () => {
    vote.targetPeerId = ['other-peer-id'];
    create();

    expect(widget()).toBeNull();
  });

  it('終了した投票では消える', () => {
    create();
    expect(widget()).not.toBeNull();

    vote.isFinish = true;
    notifyVoteChanged();
    fixture.detectChanges();

    expect(widget()).toBeNull();
  });

  it('折りたたんでもウィジェットは残り棄権にもならない', () => {
    create();

    internals.toggleCollapsed();
    fixture.detectChanges();

    expect(widget()).not.toBeNull();
    expect(vote.isVoteEnd('my-peer-id')).toBe(false);
    expect(chatStub.sendSystemMessageAsLastSpeaker).not.toHaveBeenCalled();
  });

  it('新しい投票が始まると折りたたみを解除する', () => {
    create();
    internals.toggleCollapsed();
    fixture.detectChanges();

    emitStartVote();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="vote-widget-abstain"]')).not.toBeNull();
  });

  it('回答は投票を始めたタブへ送る', () => {
    create();

    internals.voteSend('準備完了');

    expect(vote.isVoteEnd('my-peer-id')).toBe(true);
    expect(chatStub.sendSystemMessageAsLastSpeaker).toHaveBeenCalledWith(expect.any(String), 'tab-main');
  });

  it('棄権は明示操作のときだけ記録する', () => {
    create();

    internals.abstain();

    expect(myCursor.voteAnswer).toBe(-2);
    expect(chatStub.sendSystemMessageAsLastSpeaker).toHaveBeenCalledWith(expect.any(String), 'tab-main');
  });

  it('議長は未回答を残したまま締め切れる', () => {
    vote.chairId = 'my-peer-id';
    create();

    internals.finishByChair();

    expect(vote.isFinish).toBe(true);
  });

  it('議長でなければ締め切れない', () => {
    create();

    internals.finishByChair();

    expect(vote.isFinish).toBe(false);
  });
});
