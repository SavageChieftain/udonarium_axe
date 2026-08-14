import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageFile } from '@axe/core/storage/image-file';
import { GameCharacterGeneratorComponent } from '@axe/features/character/game-character-generator/game-character-generator.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameCharacterGeneratorComponent', () => {
  let component: GameCharacterGeneratorComponent;
  let fixture: ComponentFixture<GameCharacterGeneratorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterGeneratorComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCharacterGeneratorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with no background image', () => {
    const image = component.tableBackgroundImage();
    expect(image).toBeInstanceOf(ImageFile);
    expect(image.identifier).toBe('null');
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(GameCharacterGeneratorComponent);
  });
});
