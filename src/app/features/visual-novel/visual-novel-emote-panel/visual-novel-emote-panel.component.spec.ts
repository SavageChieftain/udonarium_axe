import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { VisualNovelEmotePanelComponent } from '@axe/features/visual-novel/visual-novel-emote-panel/visual-novel-emote-panel.component';
import { VisualNovelEmoteSelectionService } from '@axe/features/visual-novel/visual-novel-emote-selection.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelEmotePanelComponent', () => {
  let fixture: ComponentFixture<VisualNovelEmotePanelComponent>;
  let component: VisualNovelEmotePanelComponent;
  let selection: VisualNovelEmoteSelectionService;

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [VisualNovelEmotePanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    selection = TestBed.inject(VisualNovelEmoteSelectionService);
    selection.reset();
    fixture = TestBed.createComponent(VisualNovelEmotePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    PeerCursor.myCursor.role = PeerRole.Player;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('writes what is chosen where the screen that sends will read it', () => {
    component.selectedShape.set('shout');
    expect(selection.emote().shape).toBe('shout');
  });

  it('reads back what was chosen elsewhere', () => {
    selection.portraitEmote.set('tremble');
    expect(component.selectedPortraitEmote()).toBe('tremble');
  });

  it('puts everything back at once', () => {
    component.selectedShape.set('shout');
    component.toggleSelectedExit();

    component.resetEmote();

    expect(selection.hasSelection()).toBe(false);
  });

  it('shows a mark as its glyph and says nothing for none', () => {
    expect(component.emotionMarkLabel('anger')).toBe('💢');
    expect(component.emotionMarkLabel('none')).toBe('');
  });
});
