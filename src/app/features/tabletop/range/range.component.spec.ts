import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
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
      void component.name();
      expect(spy).toHaveBeenCalledWith(range.identifier);
    });
  });

  describe('_clipVersionシグナル (Zoneless CD)', () => {
    type PrivClipVersion = { _clipVersion: { (): number; update(fn: (v: number) => number): void } };

    it('初期値が0であること', () => {
      const priv = component as unknown as PrivClipVersion;
      expect(priv._clipVersion()).toBe(0);
    });

    it('updateで値がインクリメントされること', () => {
      const priv = component as unknown as PrivClipVersion;
      priv._clipVersion.update((v) => v + 1);
      expect(priv._clipVersion()).toBe(1);
    });

    it('clipPath computed が CORN 形状で polygon 文字列を返すこと', () => {
      const range = RangeArea.create('テスト', 3, 5, 1);
      range.type = 'CORN';
      fixture.componentRef.setInput('range', range);
      expect(component.clipPath()).toContain('polygon(');
    });
  });

  describe('movableOption / rotableOption (effect経由)', () => {
    it('rangeインプット設定後にmovableOptionのtabletopObjectがrangeになること', () => {
      const range = RangeArea.create('テスト', 3, 5, 1);
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();
      expect(component.movableOption().tabletopObject).toBe(range);
    });

    it('rangeインプット設定後にrotableOptionのtabletopObjectがrangeになること', () => {
      const range = RangeArea.create('テスト', 3, 5, 1);
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();
      expect(component.rotableOption().tabletopObject).toBe(range);
    });
  });

  describe('回転ハンドル', () => {
    it('四角形でも回転ハンドルを表示すること', () => {
      const range = RangeArea.create('テスト', 3, 3, 1);
      range.type = 'SQUARE';
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();

      expect(component.usesSingleRotateGrab()).toBe(true);
      expect(fixture.nativeElement.querySelector('.rotate-grab')).toBeTruthy();
    });

    it('円形では回転ハンドルを表示しないこと', () => {
      const range = RangeArea.create('テスト', 3, 3, 1);
      range.type = 'CIRCLE';
      fixture.componentRef.setInput('range', range);
      fixture.detectChanges();

      expect(component.isRotatableRangeType()).toBe(false);
      expect(component.usesSingleRotateGrab()).toBe(false);
      expect(fixture.nativeElement.querySelector('.rotate-grab')).toBeNull();
    });

    it.each(['TRIANGLE', 'PENTAGON', 'HEXAGON'])(
      '%s の回転ハンドルをクリップ外の大きな単一ハンドルにすること',
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
