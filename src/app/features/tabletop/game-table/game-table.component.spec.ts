import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameTableComponent } from '@axe/features/tabletop/game-table/game-table.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableComponent', () => {
  let component: GameTableComponent;
  let fixture: ComponentFixture<GameTableComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInitでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    let ng0203Thrown = false;
    try {
      component.ngOnInit();
    } catch (e: unknown) {
      if (String(e).includes('NG0203')) {
        ng0203Thrown = true;
      }
    }
    expect(ng0203Thrown).toBe(false);
  });
});
