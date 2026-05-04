import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridType } from '@axe/domain/tabletop/game-table';
import { SlopeDirection, Terrain } from '@axe/domain/tabletop/terrain';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TerrainComponent', () => {
  let component: TerrainComponent;
  let fixture: ComponentFixture<TerrainComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TerrainComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TerrainComponent);
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
      uiSignalService.notifyTableViewRotation(50, 20, 45);
      expect(component.viewRotateZ()).toBe(45);
    });
  });

  describe('terrainGridCanvasStyle', () => {
    it('ヘクス床グリッドのcanvasをclip内相対で中央配置すること', () => {
      const terrain = Terrain.create('hex terrain', 3, 3, 1, '', '');
      const table = component.currentTable;
      const originalGridType = table.gridType;
      table.gridType = GridType.HEX_VERTICAL;
      fixture.componentRef.setInput('terrain', terrain);

      const clipStyle = component.terrainGridClipStyle();
      const canvasStyle = component.terrainGridCanvasStyle();
      const clipWidth = Number.parseFloat(clipStyle.width);
      const clipHeight = Number.parseFloat(clipStyle.height);
      const canvasWidth = Number.parseFloat(canvasStyle.width);
      const canvasHeight = Number.parseFloat(canvasStyle.height);

      expect(Number.parseFloat(canvasStyle.left)).toBeCloseTo((clipWidth - canvasWidth) / 2);
      expect(Number.parseFloat(canvasStyle.top)).toBeCloseTo((clipHeight - canvasHeight) / 2);

      table.gridType = originalGridType;
      terrain.destroy();
    });

    it('ヘクス傾斜では床ステップと同じ高さとマスクでグリッドを分割すること', () => {
      const terrain = Terrain.create('hex slope terrain', 3, 3, 1, '', '');
      const table = component.currentTable;
      const originalGridType = table.gridType;
      table.gridType = GridType.HEX_VERTICAL;
      terrain.isSlope = true;
      terrain.slopeDirection = SlopeDirection.BOTTOM;
      fixture.componentRef.setInput('terrain', terrain);

      const step = component.hexSlopeSteps().floors[0];
      const style = component.terrainGridClipStepStyle(step);

      expect(component.hexSlopeSteps().floors.length).toBeGreaterThan(1);
      expect(style.transform).toBe(`translateZ(${step.heightPx}px)`);
      expect(style.mask).toBe(step.mask);
      expect(style['-webkit-mask']).toBe(step.mask);
      expect(style['clip-path']).toBeUndefined();

      table.gridType = originalGridType;
      terrain.destroy();
    });
  });
});
