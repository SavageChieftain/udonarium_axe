import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
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

  describe('viewRotateZ computed signal', () => {
    it('初期値はデフォルト10であること', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('UiSignalServiceのtableViewRotationに連動してZ回転値が変わること', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 180);
      expect(component.viewRotateZ()).toBe(180);
    });

    it('isInverseがviewRotateZに基づいて正しく判定されること', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(0, 0, 10);
      expect(component.isInverse).toBe(false);

      uiSignalService.notifyTableViewRotation(0, 0, 180);
      expect(component.isInverse).toBe(true);

      uiSignalService.notifyTableViewRotation(0, 0, 270);
      expect(component.isInverse).toBe(false);
    });
  });
});
