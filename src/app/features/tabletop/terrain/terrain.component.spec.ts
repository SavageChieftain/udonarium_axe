import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { GridType } from '@axe/domain/tabletop/game-table';
import { DoorStyle, SlopeDirection, Terrain } from '@axe/domain/tabletop/terrain';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
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
    it('starts at ten', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('turns with the table view', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 45);
      expect(component.viewRotateZ()).toBe(45);
    });
  });

  describe('doors', () => {
    it('runs a sliding door the length of itself, into the wall it was set into', () => {
      const terrain = Terrain.create('sliding door', 0.25, 1, 2, '', '');
      terrain.doorStyle = DoorStyle.SLIDE;
      terrain.isDoorOpen = true;
      fixture.componentRef.setInput('terrain', terrain);

      expect(component.doorTransform()).toBe(` translateY(${component.gridSize}px)`);

      terrain.destroy();
    });

    it('turns the other one of a pair the other way, so the two open apart', async () => {
      const door = Terrain.create('door', 0.25, 1, 2, '', '');
      door.doorStyle = DoorStyle.SWING;
      door.isDoorOpen = true;
      fixture.componentRef.setInput('terrain', door);
      const swing = component.doorTransform();
      const hinge = component.doorOrigin();

      door.doorMirrored = true;
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(component.doorTransform()).not.toBe(swing);
      expect(component.doorOrigin()).not.toBe(hinge);

      door.destroy();
    });
  });

  describe('terrainGridCanvasStyle', () => {
    it('centres the hex grid canvas within its clip', () => {
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

    it('splits the grid along the floor steps of a hex slope, mask and all', () => {
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
