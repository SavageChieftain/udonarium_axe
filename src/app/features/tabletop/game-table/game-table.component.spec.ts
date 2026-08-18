import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileLayoutService } from '@axe/application/ui/mobile-layout.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GridType } from '@axe/domain/tabletop/game-table';
import { GameTableComponent } from '@axe/features/tabletop/game-table/game-table.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableComponent', () => {
  let component: GameTableComponent;
  let fixture: ComponentFixture<GameTableComponent>;
  let store: ObjectStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    fixture = TestBed.createComponent(GameTableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
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
});
