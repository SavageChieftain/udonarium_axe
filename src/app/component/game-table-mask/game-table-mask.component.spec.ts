import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameTableMaskComponent } from './game-table-mask.component';

describe('GameTableMaskComponent', () => {
  let component: GameTableMaskComponent;
  let fixture: ComponentFixture<GameTableMaskComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableMaskComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableMaskComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnChangesでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    let ng0203Thrown = false;
    try {
      component.ngOnChanges();
    } catch (e: unknown) {
      if (String(e).includes('NG0203')) {
        ng0203Thrown = true;
      }
    }
    expect(ng0203Thrown).toBe(false);
  });
});
