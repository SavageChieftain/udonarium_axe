import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RangeArea } from '@axe/domain/tabletop/range';
import { RangeComponent } from '@axe/features/tabletop/range/range.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

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

  describe('signal-driven CD', () => {
    it('nameゲッターがversionOfシグナルを使用すること', () => {
      const range = RangeArea.create('テスト範囲', 3, 5, 1);
      fixture.componentRef.setInput('range', range);
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'versionOf');
      void component.name;
      expect(spy).toHaveBeenCalledWith(range.identifier);
    });
  });
});
