import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileLayoutService } from '@axe/application/ui/mobile-layout.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GridType } from '@axe/domain/tabletop/game-table';
import { TableSurface } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { GameTableComponent } from '@axe/features/tabletop/game-table/game-table.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableComponent', () => {
  let component: GameTableComponent;
  let fixture: ComponentFixture<GameTableComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('characters', () => {
    const MINE = ['いち', 'に'];

    function makeCharacter(name: string): GameCharacter {
      const character = GameCharacter.create(name, 1, '');
      character.location.name = 'table';
      return character;
    }

    const laidOut = () =>
      component
        .characters()
        .map((c) => c.name)
        .filter((name) => MINE.includes(name));

    it('lays the pieces out in the order they are stacked', () => {
      const under = makeCharacter('いち');
      const over = makeCharacter('に');
      under.zindex = 5;
      over.zindex = 1;

      expect(laidOut()).toEqual(['に', 'いち']);
    });

    it('lays them out again once one of them moves up the pile', async () => {
      const first = makeCharacter('いち');
      const second = makeCharacter('に');
      first.zindex = 0;
      second.zindex = 1;
      // Settle the arrivals first: a piece's own change bumps its version and not the
      // collection's, and that is the only thing left to notice the order has moved.
      await Promise.resolve();
      expect(laidOut()).toEqual(['いち', 'に']);

      first.toTopmost();
      await Promise.resolve();

      expect(laidOut()).toEqual(['に', 'いち']);
    });
  });

  describe('buildContextMenuActions', () => {
    const position = { x: 0, y: 0, z: 0 };
    const names = () => component.buildContextMenuActions(position).map((action) => action.name);

    it('leaves out the piece-making item on a desktop', () => {
      TestBed.inject(MobileLayoutService).prefersDesktop.set(true);

      expect(names()).not.toContain('コマを作る…');
      expect(names()).toContain('キャラクターを作成');
      expect(names()).toContain('画像タグから山札を作成');
    });

    it('offers it on a mobile layout', () => {
      const mobileLayout = TestBed.inject(MobileLayoutService);
      mobileLayout.prefersDesktop.set(false);
      Object.defineProperty(mobileLayout, 'isActive', { value: () => true, configurable: true });

      expect(names()).toContain('コマを作る…');
    });
  });

  describe('tableSurfaceStyle', () => {
    it('leaves a square table on its default rectangle', () => {
      const table = component.currentTable;
      table.gridType = GridType.SQUARE;

      expect(component.tableSurfaceStyle()).toMatchObject({
        width: '100%',
        height: '100%',
        left: '0px',
        top: '0px',
        mask: 'none',
      });
      expect(component.tableSurfaceBorderStyle()).toEqual({ background: 'none' });
    });

    it('widens a hex table to the outline of the hexes and masks it', () => {
      const table = component.currentTable;
      table.width = 3;
      table.height = 2;
      table.gridSize = 50;
      table.gridType = GridType.HEX_VERTICAL;

      const style = component.tableSurfaceStyle();
      const borderStyle = component.tableSurfaceBorderStyle();

      expect(Number.parseFloat(style?.width ?? '')).toBeCloseTo((50 / Math.sqrt(3)) * 2 + (50 / Math.sqrt(3)) * 3);
      expect(Number.parseFloat(style?.height ?? '')).toBeCloseTo(125);
      expect(Number.parseFloat(style?.left ?? '')).toBeCloseTo(-50 / Math.sqrt(3));
      expect(Number.parseFloat(style?.top ?? '')).toBeCloseTo(-25);
      expect(style?.mask).toContain('data:image/svg+xml');
      expect(style?.['-webkit-mask']).toBe(style?.mask);
      expect(borderStyle?.background).toContain('data:image/svg+xml');
    });
  });

  describe('the pools on its walls', () => {
    it('measures a pool from the end each wall is drawn from', () => {
      const pool = { localX: 100, localY: 40, radiusX: 80, radiusY: 80, color: '#ffffff', intensity: 1 };
      const at = (surface: TableSurface) => component['wallPoolStyleFor'](pool, surface, 1000)['mask-image'];

      expect(at('north-wall')).toContain('at 100px');
      expect(at('east-wall')).toContain('at 100px');
      expect(at('south-wall')).toContain('at 900px');
      expect(at('west-wall')).toContain('at 900px');
    });
  });

  describe('wallBackground', () => {
    it('backs a wall with the picture alone when no grid is asked for', () => {
      const bg = component.wallBackground('blob:wall', '');
      expect(bg.surfaceBackground).toBe('url(blob:wall)');
      expect(bg.surfaceBackgroundSize).toBe('100% 100%');
      expect(bg.surfaceBackgroundRepeat).toBe('no-repeat');
    });

    it('lays the grid over the picture when one is', () => {
      const bg = component.wallBackground('blob:wall', 'data:image/png;base64,AAA');
      expect(bg.surfaceBackground).toBe('url(data:image/png;base64,AAA), url(blob:wall)');
      expect(bg.surfaceBackgroundSize).toBe('100% 100%, 100% 100%');
      expect(bg.surfaceBackgroundRepeat).toBe('no-repeat, no-repeat');
    });
  });

  describe('walls', () => {
    function picture(url: string): string {
      return TestBed.inject(ImageStorage).add(url).identifier;
    }

    it('raises only the walls that are switched on and have a picture', async () => {
      const table = component.currentTable;
      table.showNorthWall = true;
      table.northWallImageIdentifier = picture('blob:north');
      table.showSouthWall = true;
      table.showEastWall = false;
      table.eastWallImageIdentifier = picture('blob:east');
      table.showWestWall = true;
      table.westWallImageIdentifier = picture('blob:west');
      await Promise.resolve();

      const walls = component.activeWalls();

      expect(walls.map((wall) => wall.surface)).toEqual(['north-wall', 'west-wall']);
      expect(walls[0]).toMatchObject({
        containerClass: 'top-0 left-0',
        containerTransform: 'translateY(-100%) rotateX(90deg) rotateZ(180deg) scaleX(-1)',
        containerOrigin: '50% 100%',
        widthPx: table.width * table.gridSize,
        heightPx: table.wallHeight * table.gridSize,
        surfaceBackground: 'url(blob:north)',
      });
      expect(walls[1]).toMatchObject({
        containerClass: 'top-0 left-0',
        containerOrigin: '0% 0%',
        widthPx: table.height * table.gridSize,
        heightPx: table.wallHeight * table.gridSize,
        surfaceBackground: 'url(blob:west)',
      });
    });

    it('lays a rasterised grid over each wall while the table shows its grid', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as RenderingContext
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,GRID');
      const table = component.currentTable;
      table.gridShow = true;
      table.showSouthWall = true;
      table.southWallImageIdentifier = picture('blob:south');
      await Promise.resolve();

      const [south] = component.activeWalls();

      expect(south.surface).toBe('south-wall');
      expect(south.surfaceBackground).toBe('url(data:image/png;base64,GRID), url(blob:south)');
      expect(south.surfaceBackgroundSize).toBe('100% 100%, 100% 100%');
    });

    it('describes each face by the edge it runs along and the way it looks', () => {
      const table = component.currentTable;
      table.width = 20;
      table.height = 10;
      table.gridSize = 50;
      table.wallHeight = 4;

      expect(component['wallFaceFor']('north-wall')).toEqual({
        ax: 0,
        ay: 0,
        bx: 1000,
        by: 0,
        nx: 0,
        ny: 1,
        heightPx: 200,
      });
      expect(component['wallFaceFor']('south-wall')).toEqual({
        ax: 0,
        ay: 500,
        bx: 1000,
        by: 500,
        nx: 0,
        ny: -1,
        heightPx: 200,
      });
      expect(component['wallFaceFor']('west-wall')).toEqual({
        ax: 0,
        ay: 0,
        bx: 0,
        by: 500,
        nx: 1,
        ny: 0,
        heightPx: 200,
      });
      expect(component['wallFaceFor']('east-wall')).toEqual({
        ax: 1000,
        ay: 0,
        bx: 1000,
        by: 500,
        nx: -1,
        ny: 0,
        heightPx: 200,
      });
      expect(component['wallFaceFor']('floor')).toBeNull();
    });

    it('hands the same wall views back while nothing changes', async () => {
      const table = component.currentTable;
      table.showNorthWall = true;
      table.northWallImageIdentifier = picture('blob:north');
      await Promise.resolve();

      const views = component['wallViews']();

      expect(views.map((view) => view.wall.surface)).toEqual(['north-wall']);
      expect(views[0].pools).toEqual([]);
      expect(views[0].silhouettes).toEqual([]);
      expect(component['wallViews']()).toBe(views);
    });

    it('has no pools or silhouettes on a wall while nothing is lit', () => {
      expect(component['wallPoolsFor']('north-wall')).toEqual([]);
      expect(component['wallSilhouettesFor']('east-wall')).toEqual([]);
      expect(component['wallBaseFilter']()).toBeNull();
    });
  });

  describe('grid faces', () => {
    it('rasterises a face once and hands the same picture back for the same geometry', () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as RenderingContext
      );
      const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,GRID');
      const table = component.currentTable;

      const first = component['gridFaces'].dataUrl(table, 500, 200, 0, 0, 'N', null);
      const again = component['gridFaces'].dataUrl(table, 500, 200, 0, 0, 'N', null);
      const other = component['gridFaces'].dataUrl(table, 500, 200, 0, 0, 'S', [-1, 0, 0, 1]);
      const face = component['gridFaces'].dataUrl(table, 100, 150, 0, 50, 'N', null);
      const faceAgain = component['gridFaces'].dataUrl(table, 100, 150, 0, 50, 'N', null);

      expect(first).toBe('data:image/png;base64,GRID');
      expect(again).toBe(first);
      expect(other).toBe('data:image/png;base64,GRID');
      expect(faceAgain).toBe(face);
      expect(encode).toHaveBeenCalledTimes(3);
    });

    it('rasterises again once the grid colour changes', () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as RenderingContext
      );
      const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,GRID');
      const table = component.currentTable;

      component['gridFaces'].dataUrl(table, 500, 200, 0, 0, 'N', null);
      table.gridColor = '#ff0000ff';
      component['gridFaces'].dataUrl(table, 500, 200, 0, 0, 'N', null);

      expect(encode).toHaveBeenCalledTimes(2);
    });
  });

  describe('beam grids', () => {
    function terrainOn(surface: string, isGrid: boolean): Terrain {
      const terrain = Terrain.create('梁', 2, 3, 1, '', '');
      terrain.location.surface = surface;
      terrain.isGrid = isGrid;
      component.currentTable.appendChild(terrain);
      return terrain;
    }

    it('lists a grid for each gridded terrain that hangs on a wall', async () => {
      const table = component.currentTable;
      table.gridShow = true;
      terrainOn('floor', true);
      const hung = terrainOn('north-wall', true);
      terrainOn('east-wall', false);
      await Promise.resolve();

      const tops = component.beamTopGrids();
      const faces = component.beamWallGrids();

      expect(tops.map((grid) => grid.identifier)).toEqual([hung.identifier]);
      expect(faces.map((grid) => grid.identifier)).toEqual([hung.identifier]);
      expect(faces[0]).toMatchObject({ width: 2 * table.gridSize, height: 3 * table.gridSize });
      expect(faces[0].matrix3d).toMatch(/^matrix3d\(/);
    });

    it('lists none while the table hides its grid', async () => {
      const table = component.currentTable;
      table.gridShow = false;
      terrainOn('north-wall', true);
      await Promise.resolve();

      expect(component.beamTopGrids()).toEqual([]);
      expect(component.beamWallGrids()).toEqual([]);
    });
  });

  describe('camera glide', () => {
    it('eases the table to the focus and takes the easing off again', () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      const tableEl = component.gameTable().nativeElement;

      TestBed.inject(SelectionSignalService).focusCoordinate.set({ x: 100, y: 100, timestamp: 1 });
      fixture.detectChanges();
      vi.advanceTimersByTime(50);
      expect(tableEl.style.transition).toBe('0.2s ease-out');

      vi.advanceTimersByTime(100);
      expect(tableEl.style.transition).toBe('');
      vi.useRealTimers();
    });

    it('drops the glide when the table goes before it lands', () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      const tableEl = component.gameTable().nativeElement;

      TestBed.inject(SelectionSignalService).focusCoordinate.set({ x: 100, y: 100, timestamp: 2 });
      fixture.detectChanges();
      fixture.destroy();
      vi.advanceTimersByTime(200);

      expect(tableEl.style.transition).toBe('');
      expect(vi.getTimerCount()).toBe(0);
      vi.useRealTimers();
    });
  });
});
