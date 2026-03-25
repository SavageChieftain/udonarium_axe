import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/shared/ui-signal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { RangeComponent } from './range.component';

describe('RangeComponent', () => {
  let component: RangeComponent;
  let fixture: ComponentFixture<RangeComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RangeComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RangeComponent);
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
      uiSignalService.notifyTableViewRotation(50, 20, 90);
      expect(component.viewRotateZ()).toBe(90);
    });
  });
});
