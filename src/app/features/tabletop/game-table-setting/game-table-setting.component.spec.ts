import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CutInService } from '@axe/application/media/cut-in.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { Config } from '@axe/domain/peer/config';
import { FilterType, GameTable, GridSnapStyle, GridType } from '@axe/domain/tabletop/game-table';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableSettingComponent', () => {
  let component: GameTableSettingComponent;
  let fixture: ComponentFixture<GameTableSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableSettingComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    // The component reads the config out of the store to find the default dice bot, so a
    // singleton has to be registered or a test run on its own dereferences nothing.
    if (!ObjectStore.instance.get('Config')) {
      const config = new Config('Config');
      config.initialize();
    }
    fixture = TestBed.createComponent(GameTableSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for no change detector', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  describe('with no table selected', () => {
    beforeEach(() => {
      component.selectedTable = null;
    });

    it('detects changes without throwing', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('returns the default', () => {
      expect(component.tableName).toBe('');
      expect(component.tableWidth).toBe(10);
      expect(component.tableHeight).toBe(10);
      expect(component.tableGridColor).toBe('#000000');
      expect(component.tableGridFontColor).toBe('#000000');
      expect(component.tableGridType).toBe(0 as GridType);
      expect(component.tableGridSnapStyle).toBe(GridSnapStyle.CENTER);
      expect(component.tableSnapMode).toBe('center');
      expect(component.tableDistanceviewFilter).toBe(FilterType.NONE);
    });

    it('sets without throwing', () => {
      expect(() => {
        component.tableName = 'test';
        component.tableWidth = 20;
        component.tableHeight = 20;
        component.tableGridColor = '#ffffff';
        component.tableGridFontColor = '#ff0000';
        component.tableGridType = 1 as GridType;
        component.tableGridSnapStyle = GridSnapStyle.VERTEX;
        component.tableDistanceviewFilter = FilterType.WHITE;
      }).not.toThrow();
    });
  });

  describe('how a piece shows which way it faces', () => {
    it('shows nothing for a table that has never been asked', () => {
      component.selectedTable = null;
      expect(component.tableFacingMark).toBe('none');
    });

    it('writes the choice onto the table', () => {
      const table = new GameTable();
      table.initialize();
      component.selectedTable = table;

      component.tableFacingMark = 'arrow';

      expect(table.facingMark).toBe('arrow');
      expect(component.tableFacingMark).toBe('arrow');
      table.destroy();
    });

    it('reads a table carrying something it does not know as showing nothing', () => {
      const table = new GameTable();
      table.initialize();
      table.facingMark = 'compass' as never;
      component.selectedTable = table;

      expect(component.tableFacingMark).toBe('none');
      table.destroy();
    });
  });

  describe('how far a piece may walk', () => {
    it('hands back the defaults with no table selected', () => {
      component.selectedTable = null;
      expect(component.tableMoveRangeEnabled).toBe(true);
      expect(component.tableMoveRangeElementNames).toBe('移動,移動力,Speed,速度');
      expect(component.tableCellDistance).toBe(1);
      expect(component.tableCellDistanceUnit).toBe('cell');
    });

    it('puts the question of corners only to a square board', () => {
      const table = new GameTable();
      table.initialize();
      component.selectedTable = table;

      table.gridType = GridType.SQUARE;
      expect(component.showsDiagonalOption).toBe(true);

      table.gridType = GridType.HEX_VERTICAL;
      expect(component.showsDiagonalOption).toBe(false);

      table.destroy();
    });

    it('writes all four onto the table', () => {
      const table = new GameTable();
      table.initialize();
      component.selectedTable = table;

      component.tableMoveRangeEnabled = false;
      component.tableMoveRangeElementNames = 'Speed';
      component.tableCellDistance = 5;
      component.tableCellDistanceUnit = 'ft';

      expect(table.moveRangeEnabled).toBe(false);
      expect(table.moveRangeElementNames).toBe('Speed');
      expect(table.cellDistance).toBe(5);
      expect(table.cellDistanceUnit).toBe('ft');
      table.destroy();
    });

    it('takes a distance that is not a number as no conversion at all', () => {
      const table = new GameTable();
      table.initialize();
      component.selectedTable = table;

      component.tableCellDistance = Number.NaN;

      expect(table.cellDistance).toBe(0);
      table.destroy();
    });
  });

  describe('the ground an enemy holds', () => {
    let table: GameTable;

    beforeEach(() => {
      table = new GameTable();
      table.initialize();
      component.selectedTable = table;
    });

    afterEach(() => {
      table.destroy();
    });

    it('hands back the defaults with no table selected', () => {
      component.selectedTable = null;

      expect(component.tableZocMode).toBe('none');
      expect(component.tableZocRange).toBe(1);
      expect(component.tableZocExtraCost).toBe(1);
    });

    it('asks nothing more of a table where an enemy holds no ground', () => {
      component.tableZocMode = 'none';

      expect(component.showsZocOptions).toBe(false);
      expect(component.showsZocExtraCost).toBe(false);
    });

    it('asks how far the ground reaches, and what it costs only where it is charged for', () => {
      component.tableZocMode = 'stop';
      expect(component.showsZocOptions).toBe(true);
      expect(component.showsZocExtraCost).toBe(false);

      component.tableZocMode = 'block';
      expect(component.showsZocExtraCost).toBe(false);

      component.tableZocMode = 'cost';
      expect(component.showsZocOptions).toBe(true);
      expect(component.showsZocExtraCost).toBe(true);
    });

    it('writes all three onto the table', () => {
      component.tableZocMode = 'cost';
      component.tableZocRange = 2;
      component.tableZocExtraCost = 3;

      expect(table.zocMode).toBe('cost');
      expect(table.zocRange).toBe(2);
      expect(table.zocExtraCost).toBe(3);
    });

    it('reads a table carrying something it does not know as holding no ground', () => {
      table.zocMode = 'engagement';

      expect(component.tableZocMode).toBe('none');
    });

    it('takes a reach that is not a whole count as none at all', () => {
      component.tableZocRange = Number.NaN;
      component.tableZocExtraCost = -2;

      expect(table.zocRange).toBe(0);
      expect(table.zocExtraCost).toBe(0);
    });

    it('shows the boxes only once an enemy holds ground', async () => {
      function boxes(): string[] {
        return [...fixture.nativeElement.querySelectorAll('input[type="number"]')].map(
          (node: Element) => node.getAttribute('name') ?? ''
        );
      }

      component.tableZocMode = 'none';
      fixture.detectChanges();
      await fixture.whenStable();
      expect(boxes()).not.toContain('tableZocRange');

      component.tableZocMode = 'stop';
      fixture.detectChanges();
      await fixture.whenStable();
      expect(boxes()).toContain('tableZocRange');
      expect(boxes()).not.toContain('tableZocExtraCost');

      component.tableZocMode = 'cost';
      fixture.detectChanges();
      await fixture.whenStable();
      expect(boxes()).toContain('tableZocExtraCost');
    });
  });

  describe('signal-driven CD', () => {
    it('reads the deleted flag through a collection signal', () => {
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'collectionOf');
      void component.isDeleted;
      expect(spy).toHaveBeenCalledWith('game-table');
    });

    it('reads the background image through a version signal', () => {
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'versionOf');
      const table = new GameTable();
      table.initialize();
      component.selectedTable = table;
      void component.tableBackgroundImage;
      expect(spy).toHaveBeenCalledWith(table.identifier);
    });

    it('reads the distance view image through a version signal', () => {
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'versionOf');
      const table = new GameTable();
      table.initialize();
      component.selectedTable = table;
      void component.tableDistanceviewImage;
      expect(spy).toHaveBeenCalledWith(table.identifier);
    });
  });

  describe('choosing a table from the list', () => {
    let table: GameTable;

    function watchLaunch() {
      return vi.spyOn(TestBed.inject(CutInService), 'launchForTable').mockReturnValue(true);
    }

    beforeEach(() => {
      table = new GameTable();
      table.initialize();
    });

    it('plays what the table asks for', () => {
      const launchForTable = watchLaunch();

      component.chooseGameTable(table.identifier);

      expect(launchForTable).toHaveBeenCalledWith(table);
    });

    it('stays quiet on the table already showing', () => {
      const launchForTable = watchLaunch();
      component.chooseGameTable(table.identifier);
      launchForTable.mockClear();

      component.chooseGameTable(table.identifier);

      expect(launchForTable).not.toHaveBeenCalled();
    });

    it('stays quiet when a table is only created', () => {
      const launchForTable = watchLaunch();

      component.selectGameTable(table.identifier);

      expect(launchForTable).not.toHaveBeenCalled();
    });

    it('reads and writes the cut-ins the table names', () => {
      component.selectedTable = table;
      component.tableCutIns = ['cut-1', 'cut-2'];

      expect(table.cutInIdentifiers).toBe('cut-1,cut-2');
      expect(component.tableCutIns).toEqual(['cut-1', 'cut-2']);
    });

    it('names the cut-ins it shows as chips', async () => {
      const cutIn = new CutIn();
      cutIn.initialize();
      cutIn.name = 'オープニング';
      table.cutInIdentifiers = cutIn.identifier;
      component.selectedTable = table;

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const labels = [...fixture.nativeElement.querySelectorAll('.ng-value-label')].map(
        (node: Element) => node.textContent
      );
      expect(labels).toContain('オープニング');
    });

    it('hands back the same list until the table names other cut-ins', () => {
      component.selectedTable = table;
      component.tableCutIns = ['cut-1', 'cut-2'];
      const list = component.tableCutIns;

      expect(component.tableCutIns).toBe(list);

      component.tableCutIns = ['cut-1'];

      expect(component.tableCutIns).not.toBe(list);
      expect(component.tableCutIns).toEqual(['cut-1']);
    });
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(GameTableSettingComponent);
  });
});
