import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { toStageResetAt } from '@axe/domain/visual-novel/vn-portrait-position';
import { VnStage } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelDirectionPanelComponent } from '@axe/features/visual-novel/visual-novel-direction-panel/visual-novel-direction-panel.component';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelDirectionPanelComponent', () => {
  let fixture: ComponentFixture<VisualNovelDirectionPanelComponent>;
  let component: VisualNovelDirectionPanelComponent;
  let tab: ChatTab;

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [VisualNovelDirectionPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    if (!ObjectStore.instance.get('VnStage')) new VnStage('VnStage').initialize();
    tab = ChatTabList.instance.addChatTab('テストタブ');
    TestBed.inject(VisualNovelPlaybackService).setChatTab(tab.identifier);
    fixture = TestBed.createComponent(VisualNovelDirectionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    tab?.destroy();
    PeerCursor.myCursor.role = PeerRole.Player;
    localStorage.removeItem('vn-settings');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers nothing to anybody but the game master', () => {
    expect(component.scene.canDirect()).toBe(false);
    expect(component.director.canDirect()).toBe(false);
  });

  it('clears the portraits of the tab being read', () => {
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    TestBed.inject(ObjectChangeService).notifyChanged(PeerCursor.myCursor.identifier);

    component.resetStage();

    expect(toStageResetAt(tab.vnPortraitResetAt)).toBeGreaterThan(0);
    expect(tab.chatMessages).toHaveLength(1);
  });
});
