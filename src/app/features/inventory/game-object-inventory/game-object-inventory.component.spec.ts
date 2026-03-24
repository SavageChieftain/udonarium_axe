import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameObjectInventoryComponent } from './game-object-inventory.component';

describe('GameObjectInventoryComponent', () => {
  let component: GameObjectInventoryComponent;
  let fixture: ComponentFixture<GameObjectInventoryComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameObjectInventoryComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameObjectInventoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInitでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
