import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { VoteWindowComponent } from '@axe/features/vote/vote-window/vote-window.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VoteWindowComponent', () => {
  let component: VoteWindowComponent;
  let fixture: ComponentFixture<VoteWindowComponent>;
  let panelService: PanelService;
  let vote: Vote;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [VoteWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    ObjectStore.instance.clearDeleteHistory();
    // Create and register Vote singleton
    vote = new Vote('Vote');
    vote.initTimeStamp = Date.now();
    ObjectStore.instance.add(vote);

    fixture = TestBed.createComponent(VoteWindowComponent);
    component = fixture.componentInstance;
    panelService = TestBed.inject(PanelService);
  });

  afterEach(() => {
    // Clean up ObjectStore after each test
    ObjectStore.instance.remove(vote);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('isFinish が同期反映されたらパネルを閉じること', () => {
    const closeSpy = vi.spyOn(panelService, 'close').mockImplementation(() => {});
    fixture.detectChanges();

    vote.isFinish = true;
    objectChanged$.emit({ identifier: vote.identifier, aliasName: vote.aliasName, isSendFromSelf: false });

    expect(closeSpy).toHaveBeenCalled();
  });

  it('PeerCursor の変更で vote computed が再評価されること', () => {
    // Set up myCursor for the test
    const myCursor = PeerCursor.createMyCursor();

    const peerA = new PeerCursor();
    peerA.peerId = 'peer-a';
    peerA.isDisConnect = false;
    peerA.initialize();
    vote.targetPeerId = [peerA.peerId];
    vote.choices = ['賛成', '反対'];
    vote.voteId = 1;

    fixture.detectChanges();

    const before = component.vote();
    expect(before.votedTotalNum()).toBe(0);

    // Simulate remote peer voting: update PeerCursor and emit change
    peerA.voteAnswer = 0;
    peerA.voteId = 1;
    objectChanged$.emit({ identifier: peerA.identifier, aliasName: 'PeerCursor', isSendFromSelf: false });

    // Re-read the computed — it should pick up the new PeerCursor version
    const after = component.vote();
    expect(after.votedTotalNum()).toBe(1);

    ObjectStore.instance.remove(peerA);
    ObjectStore.instance.remove(myCursor);
    PeerCursor.myCursor = null!;
  });
});
