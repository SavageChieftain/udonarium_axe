import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageFile } from '@axe/core/storage/image-file';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameCharacterGeneratorComponent } from './game-character-generator.component';

describe('GameCharacterGeneratorComponent', () => {
  let component: GameCharacterGeneratorComponent;
  let fixture: ComponentFixture<GameCharacterGeneratorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterGeneratorComponent],
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

  it('tableBackgroundImageの初期値が空のImageFileであること', () => {
    const image = component.tableBackgroundImage();
    expect(image).toBeInstanceOf(ImageFile);
    expect(image.identifier).toBe('null');
  });
});
