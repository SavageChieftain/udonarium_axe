import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
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

  describe('tableSurfaceStyle', () => {
    it('スクウェアでは矩形テーブル面の既定CSSを使うこと', () => {
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

    it('ヘクスではテーブル面をヘクス外形のピクセル範囲に広げてマスクすること', () => {
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
});
