import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { RangeArea } from '@axe/domain/tabletop/range';
import { RangeComponent } from '@axe/features/tabletop/range/range.component';
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
    // The 2D context of happy-dom has no drawing functions, and the range redraws even after
    // teardown, so nothing is handed back to draw with. The component already copes with that.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
    fixture = TestBed.createComponent(RangeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    // Left behind, it would turn up on the table of the next spec.
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('viewRotateZ computed signal', () => {
    it('starts at ten', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('turns with the table view', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 90);
      expect(component.viewRotateZ()).toBe(90);
    });
  });

  describe('signal-driven CD', () => {
    it('reads the name through a version signal', () => {
      const range = RangeArea.create('テスト範囲', 3, 5, 1);
      fixture.componentRef.setInput('range', range);
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'versionOf');
      void component.name();
      expect(spy).toHaveBeenCalledWith(range.identifier);
    });
  });

  describe('the clip version signal', () => {
    type PrivClipVersion = { _clipVersion: { (): number; update(fn: (v: number) => number): void } };

    it('starts at zero', () => {
      const priv = component as unknown as PrivClipVersion;
      expect(priv._clipVersion()).toBe(0);
    });

    it('counts up on an update', () => {
      const priv = component as unknown as PrivClipVersion;
      priv._clipVersion.update((v) => v + 1);
      expect(priv._clipVersion()).toBe(1);
    });

    it('gives a cone a polygon clip path', () => {
      const range = RangeArea.create('テスト', 3, 5, 1);
      range.type = 'CORN';
      fixture.componentRef.setInput('range', range);
      expect(component.clipPath()).toContain('polygon(');
    });
  });

  describe('the move and turn options', () => {
    it('points the move option at the range once it is set', () => {
      const range = RangeArea.create('テスト', 3, 5, 1);
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();
      expect(component.movableOption().tabletopObject).toBe(range);
    });

    it('points the turn option at it as well', () => {
      const range = RangeArea.create('テスト', 3, 5, 1);
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();
      expect(component.rotableOption().tabletopObject).toBe(range);
    });
  });

  describe('the turn handle', () => {
    it('shows a turn handle on a square', () => {
      const range = RangeArea.create('テスト', 3, 3, 1);
      range.type = 'SQUARE';
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();

      expect(component.usesSingleRotateGrab()).toBe(true);
      expect(fixture.nativeElement.querySelector('.rotate-grab')).toBeTruthy();
    });

    it('shows none on a circle', () => {
      const range = RangeArea.create('テスト', 3, 3, 1);
      range.type = 'CIRCLE';
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();

      expect(component.isRotatableRangeType()).toBe(false);
      expect(component.usesSingleRotateGrab()).toBe(false);
      expect(fixture.nativeElement.querySelector('.rotate-grab')).toBeNull();
    });

    it.each(['TRIANGLE', 'PENTAGON', 'HEXAGON'])(
      'keeps the turn handle of a %s a single large handle outside the clip',
      (type) => {
        const range = RangeArea.create('テスト', 3, 3, 1);
        range.type = type;
        fixture.componentRef.setInput('range', range);
        fixture.detectChanges();

        const handle = fixture.nativeElement.querySelector('.range-rotate-grab--single') as HTMLElement;

        expect(handle).toBeTruthy();
        expect(handle.closest('.range-clip-layer')).toBeNull();
        expect(handle.style.left).toBe('0px');
        expect(handle.style.top).toBe('-150px');
      }
    );
  });
});
