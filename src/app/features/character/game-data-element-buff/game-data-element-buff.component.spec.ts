import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameDataElementBuffComponent } from '@axe/features/character/game-data-element-buff/game-data-element-buff.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameDataElementBuffComponent', () => {
  let component: GameDataElementBuffComponent;
  let fixture: ComponentFixture<GameDataElementBuffComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameDataElementBuffComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameDataElementBuffComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
