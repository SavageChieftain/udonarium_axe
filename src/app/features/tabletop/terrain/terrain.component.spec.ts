import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PERF_TERRAIN_GRID_RASTER, perfCounters } from '@axe/core/util/perf-counters';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { DoorStyle, SlopeDirection, Terrain } from '@axe/domain/tabletop/terrain';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

/** happy-dom hands back no drawing context, and the grid render writes to one. */
function stubCanvasContext(): void {
  const context = new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, key) => (key in target ? target[key] : () => undefined),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as null);
}

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
    stubCanvasContext();
    fixture = TestBed.createComponent(TerrainComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    perfCounters.enabled = false;
    perfCounters.clear();
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

  describe('the grid it carries', () => {
    it('builds no canvas for terrain that was never asked to show a grid', async () => {
      const terrain = Terrain.create('wall', 1, 1, 2, '', '');
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelectorAll('canvas')).toHaveLength(0);

      terrain.destroy();
    });

    it('builds one the moment the terrain is asked to show a grid', async () => {
      const terrain = Terrain.create('floor', 1, 1, 0, '', '');
      terrain.isGrid = true;
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelectorAll('canvas')).toHaveLength(1);

      terrain.destroy();
    });

    it('cuts the grid once for a key it has already cut', async () => {
      const terrain = Terrain.create('floor', 1, 1, 0, '', '');
      terrain.isGrid = true;
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();
      const table = component.currentTable;
      perfCounters.enabled = true;
      perfCounters.clear();

      objectChanged$.emit({ aliasName: 'game-table', identifier: table.identifier, isSendFromSelf: true });
      await fixture.whenStable();

      expect(perfCounters.drain().get(PERF_TERRAIN_GRID_RASTER)).toBeUndefined();

      terrain.destroy();
    });

    it('cuts it again when the table changes the colour of its lines', async () => {
      const terrain = Terrain.create('floor', 1, 1, 0, '', '');
      terrain.isGrid = true;
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();
      const table = component.currentTable;
      const original = table.gridColor;
      perfCounters.enabled = true;
      perfCounters.clear();

      table.gridColor = '#ff0000';
      objectChanged$.emit({ aliasName: 'game-table', identifier: table.identifier, isSendFromSelf: true });
      await fixture.whenStable();

      expect(perfCounters.drain().get(PERF_TERRAIN_GRID_RASTER)).toBe(1);

      table.gridColor = original;
      terrain.destroy();
    });
  });

  describe('the place it hangs for lights', () => {
    async function wallFaceOverlays(darknessEnabled: boolean): Promise<number> {
      const table = new GameTable();
      table.width = 20;
      table.height = 20;
      table.gridSize = 50;
      table.darknessEnabled = darknessEnabled;
      table.initialize();
      ObjectStore.instance.add(table);

      const terrain = Terrain.create('wall', 1, 1, 2, 'wall', 'floor');
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();

      const count = fixture.nativeElement.querySelectorAll('.inset-0.overflow-hidden').length;
      terrain.destroy();
      ObjectStore.instance.delete(table, false);
      return count;
    }

    it('hangs one on every wall face of a table with dark in it', async () => {
      expect(await wallFaceOverlays(true)).toBe(4);
    });

    it('hangs none on a table with no dark in it', async () => {
      expect(await wallFaceOverlays(false)).toBe(0);
    });
  });

  describe('how it shades its faces', () => {
    it('lays the shade over the texture rather than filtering the face', async () => {
      const table = new GameTable();
      table.width = 20;
      table.height = 20;
      table.gridSize = 50;
      table.initialize();
      ObjectStore.instance.add(table);
      const terrain = Terrain.create('wall', 1, 1, 2, 'wall', 'floor');
      terrain.isSurfaceShading = true;
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();

      const root = fixture.nativeElement as HTMLElement;
      const faces = [...root.querySelectorAll<HTMLElement>('[style*="background-image"]')];

      expect(faces.length).toBeGreaterThan(0);
      expect(faces.every((face) => face.style.filter === '')).toBe(true);
      expect(faces.some((face) => face.style.backgroundImage.includes('linear-gradient'))).toBe(true);

      terrain.destroy();
      ObjectStore.instance.delete(table, false);
    });
  });

  describe('the lights it shows on its walls', () => {
    interface WallLighting {
      northLights: () => unknown[];
      northSilhouettes: () => unknown[];
    }

    it('hands back the same lights however far a piece walks', async () => {
      const table = new GameTable();
      table.width = 20;
      table.height = 20;
      table.gridSize = 50;
      table.darknessEnabled = true;
      table.initialize();
      ObjectStore.instance.add(table);
      const terrain = Terrain.create('wall', 1, 1, 2, 'wall', 'floor');
      fixture.componentRef.setInput('terrain', terrain);
      await fixture.whenStable();
      const walls = component as unknown as WallLighting;
      const lights = walls.northLights();
      const silhouettes = walls.northSilhouettes();

      objectChanged$.emit({ aliasName: 'character', identifier: 'somebody', isSendFromSelf: true });
      await new Promise((resolve) => setTimeout(resolve, 60));
      await fixture.whenStable();

      expect(walls.northLights()).toBe(lights);
      expect(walls.northSilhouettes()).toBe(silhouettes);

      terrain.destroy();
      ObjectStore.instance.delete(table, false);
    });
  });

  describe('the hex shape it stands on', () => {
    it('hands back the same shape after a change elsewhere on the table', async () => {
      const terrain = Terrain.create('hex terrain', 3, 3, 1, '', '');
      const table = component.currentTable;
      const originalGridType = table.gridType;
      table.gridType = GridType.HEX_VERTICAL;
      fixture.componentRef.setInput('terrain', terrain);
      const before = component.pedestalHexParams();

      objectChanged$.emit({ aliasName: 'game-table', identifier: table.identifier, isSendFromSelf: true });
      await fixture.whenStable();

      expect(component.pedestalHexParams()).toBe(before);

      table.gridType = originalGridType;
      terrain.destroy();
    });

    it('cuts a new one when the table changes what shape its cells are', async () => {
      const terrain = Terrain.create('hex terrain', 3, 3, 1, '', '');
      const table = component.currentTable;
      const originalGridType = table.gridType;
      table.gridType = GridType.HEX_VERTICAL;
      fixture.componentRef.setInput('terrain', terrain);
      const before = component.pedestalHexParams();

      table.gridType = GridType.HEX_HORIZONTAL;
      objectChanged$.emit({ aliasName: 'game-table', identifier: table.identifier, isSendFromSelf: true });
      await fixture.whenStable();

      expect(component.pedestalHexParams()).not.toBe(before);

      table.gridType = originalGridType;
      terrain.destroy();
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
