import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceTable } from '@axe/domain/dice/dice-table';
import { DiceTableSettingComponent } from '@axe/features/dice/dice-table-setting/dice-table-setting.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('DiceTableSettingComponent', () => {
  let component: DiceTableSettingComponent;
  let fixture: ComponentFixture<DiceTableSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DiceTableSettingComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiceTableSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(DiceTableSettingComponent);
  });

  describe('setting up and tearing down', () => {
    it('returns an empty game type with no table selected', () => {
      component.selectedTable = null;
      expect(component.gameType()).toBe('');
    });

    it('returns an empty name', () => {
      component.selectedTable = null;
      expect(component.tableName()).toBe('');
    });

    it('returns an empty dice bot', () => {
      component.selectedTable = null;
      expect(component.tableDice()).toBe('');
    });

    it('returns an empty command', () => {
      component.selectedTable = null;
      expect(component.tableCommand()).toBe('');
    });

    it('returns an empty text', () => {
      component.selectedTable = null;
      expect(component.tableText).toBe('');
    });

    it('returns no palettes', () => {
      component.selectedTable = null;
      expect(component.palettes()).toEqual([]);
    });

    it('toggles the edit mode without throwing', () => {
      component.selectedTable = null;
      expect(() => component.toggleEditMode()).not.toThrow();
    });

    it('toggles it twice without throwing', () => {
      component.selectedTable = null;
      expect(() => {
        component.toggleEditMode();
        component.toggleEditMode();
      }).not.toThrow();
    });
  });

  describe('reacting to the synchronised fields', () => {
    // The change channel fires in a batch on a microtask, so a write is flushed before it is read.
    it('takes a command edited by another peer', async () => {
      const table = DiceTable.create();
      try {
        table.command = 'first';
        component.selectedTable = table;
        await Promise.resolve();
        const v1 = component.tableCommand();

        table.command = 'second';
        await Promise.resolve();
        const v2 = component.tableCommand();

        expect({ v1, v2 }).toEqual({ v1: 'first', v2: 'second' });
      } finally {
        table.destroy();
      }
    });

    it('recomputes the palettes when one changes', async () => {
      const table = DiceTable.create();
      try {
        component.selectedTable = table;
        await Promise.resolve();
        const initial = component.palettes();
        expect(initial.length).toBeGreaterThan(0);

        const palette = table.diceTablePalette!;
        palette.setPalette('1:新エントリ');
        palette.update();
        await Promise.resolve();

        expect(component.palettes()).toEqual(['1:新エントリ']);
      } finally {
        table.destroy();
      }
    });
  });
});
