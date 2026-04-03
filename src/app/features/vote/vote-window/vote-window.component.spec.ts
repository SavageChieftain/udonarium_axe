import { ComponentFixture, TestBed } from '@angular/core/testing';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Vote } from '@axe/domain/vote/vote';
import { VoteWindowComponent } from '@axe/features/vote/vote-window/vote-window.component';
import { PanelService } from '@axe/shared/ui/panel.service';
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
});
