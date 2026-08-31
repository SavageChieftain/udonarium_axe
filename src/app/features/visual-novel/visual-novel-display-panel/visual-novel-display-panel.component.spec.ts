import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { VisualNovelDisplayPanelComponent } from '@axe/features/visual-novel/visual-novel-display-panel/visual-novel-display-panel.component';
import { VisualNovelSettingsService } from '@axe/features/visual-novel/visual-novel-settings.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelDisplayPanelComponent', () => {
  let fixture: ComponentFixture<VisualNovelDisplayPanelComponent>;
  let component: VisualNovelDisplayPanelComponent;

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [VisualNovelDisplayPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    fixture = TestBed.createComponent(VisualNovelDisplayPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('vn-settings');
    PeerCursor.myCursor.role = PeerRole.Player;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('settles a display setting where the rest of novel mode reads it', () => {
    component.settings.setLayout('adv');
    expect(TestBed.inject(VisualNovelSettingsService).layout()).toBe('adv');
  });

  it('offers the backdrop to the game master alone', () => {
    expect(component.scene.canDirect()).toBe(false);
  });
});
