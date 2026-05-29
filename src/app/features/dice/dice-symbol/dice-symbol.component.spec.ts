import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('DiceSymbolComponent', () => {
  let component: DiceSymbolComponent;
  let fixture: ComponentFixture<DiceSymbolComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DiceSymbolComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiceSymbolComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signal-driven CD', () => {
    it('animeStateがsignalであること', () => {
      expect(typeof component.animeState).toBe('function');
      expect(component.animeState()).toBe('inactive');
    });

    it('nameゲッターがnetworkVersionを参照していること', () => {
      const diceSymbol = DiceSymbol.create('テストダイス', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const original = objectChangeService.networkVersion;
      const spy = vi.fn(() => original());
      Object.defineProperty(objectChangeService, 'networkVersion', { value: spy, configurable: true });
      void component.name();
      expect(spy).toHaveBeenCalled();
    });

    it('isIconHiddenがsignalであること', () => {
      expect(typeof component.isIconHidden).toBe('function');
      expect(component.isIconHidden()).toBe(false);
    });
  });

  describe('billboardTransform カメラ追従', () => {
    it('tableViewRotation の変化に応じて transform 文字列が更新されること', () => {
      const diceSymbol = DiceSymbol.create('ビルボードテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const ui = TestBed.inject(UiSignalService);

      ui.notifyTableViewRotation(50, 0, 10);
      const before = component.billboardTransform();

      ui.notifyTableViewRotation(60, 20, 120);
      const after = component.billboardTransform();

      expect(before).not.toBe(after);
      expect(after).toContain('rotateZ(-120deg)');
      expect(after).toContain('rotateX(-60deg)');
      expect(after).toContain('rotateY(-20deg)');
    });

    it('ダイス自身の rotate を打ち消す回転が含まれること', () => {
      const diceSymbol = DiceSymbol.create('rotateテスト', 1, 1);
      diceSymbol.rotate = 45;
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);

      expect(component.billboardTransform()).toContain('rotateZ(-45deg)');
    });

    it('オーナー名用のビルボード変換が名前用より大きいオフセットを持つこと', () => {
      const diceSymbol = DiceSymbol.create('オフセットテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);

      const match = (s: string) => Number(s.match(/translateZ\((-?[\d.]+)px\)/)?.[1] ?? 0);
      expect(match(component.billboardTransformOwner())).toBeLessThan(match(component.billboardTransform()));
    });

    it('imageBillboardEnabled が currentTable.imageBillboard を反映すること', async () => {
      const diceSymbol = DiceSymbol.create('画像追従テスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const tabletopService = TestBed.inject(TabletopService);

      tabletopService.currentTable.imageBillboard = false;
      expect(component.imageBillboardEnabled()).toBe(false);

      tabletopService.currentTable.imageBillboard = true;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.imageBillboardEnabled()).toBe(true);
    });

    it('billboardTransformImage は verticalOffset=0 の transform を返すこと', () => {
      const diceSymbol = DiceSymbol.create('画像オフセットテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);

      expect(component.billboardTransformImage()).toContain('translateZ(0.00px)');
    });

    it('mode2d=true なら imageBillboard=false でも true を返すこと', async () => {
      const diceSymbol = DiceSymbol.create('mode2dテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const tabletopService = TestBed.inject(TabletopService);

      tabletopService.currentTable.imageBillboard = false;
      tabletopService.currentTable.mode2d = true;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.imageBillboardEnabled()).toBe(true);
    });
  });

  describe('nameLabelOrbit 2Dモード時のスクリーン上方追従', () => {
    it('3Dモードでは translateY(-distance3d) を返すこと', async () => {
      const diceSymbol = DiceSymbol.create('orbit3dテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = false;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.nameLabelOrbit()).toBe('translateY(-30px)');
    });

    it('2Dモードでヨー=0なら translateZ(-d) で画面上方向に配置されること', async () => {
      const diceSymbol = DiceSymbol.create('orbit2dテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = true;
      TestBed.inject(UiSignalService).notifyTableViewRotation(0, 0, 0);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const transform = component.nameLabelOrbit();
      expect(transform).toContain('translateZ(-60.00px)');
    });

    it('オーナー名のオフセットの絶対値の方が名前より大きいこと', async () => {
      const diceSymbol = DiceSymbol.create('orbit比較テスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = true;
      TestBed.inject(UiSignalService).notifyTableViewRotation(0, 0, 0);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const nameZ = Math.abs(Number(component.nameLabelOrbit().match(/translateZ\((-?[\d.]+)px\)/)?.[1] ?? 0));
      const ownerZ = Math.abs(Number(component.ownerLabelOrbit().match(/translateZ\((-?[\d.]+)px\)/)?.[1] ?? 0));
      expect(ownerZ).toBeGreaterThan(nameZ);
    });

    it('2Dモードでは billboardTransform の compensateZ が 0 になること', async () => {
      const diceSymbol = DiceSymbol.create('compZテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = true;
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.billboardTransform()).toContain('translateZ(0.00px)');
      expect(component.billboardTransformOwner()).toContain('translateZ(0.00px)');
    });
  });

  describe('timer cleanup on destroy', () => {
    it('doubleClickTimer が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { doubleClickTimer: NodeJS.Timeout | null };
      priv.doubleClickTimer = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('iconHiddenTimer が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { iconHiddenTimer: NodeJS.Timeout | null };
      priv.iconHiddenTimer = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
