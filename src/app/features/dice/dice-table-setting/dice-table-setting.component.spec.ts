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

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(DiceTableSettingComponent);
  });

  describe('初期化と破棄', () => {
    it('selectedTable が null の状態で gameType が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.gameType()).toBe('');
    });

    it('selectedTable が null の状態で tableName が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableName()).toBe('');
    });

    it('selectedTable が null の状態で tableDice が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableDice()).toBe('');
    });

    it('selectedTable が null の状態で tableCommand が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableCommand()).toBe('');
    });

    it('selectedTable が null の状態で tableText getter が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableText).toBe('');
    });

    it('selectedTable が null の状態で palettes() が空配列を返すこと', () => {
      component.selectedTable = null;
      expect(component.palettes()).toEqual([]);
    });

    it('selectedTable が null の状態で toggleEditMode() を呼んでも例外を出さないこと', () => {
      component.selectedTable = null;
      expect(() => component.toggleEditMode()).not.toThrow();
    });

    it('selectedTable が null の状態で toggleEditMode() を 2 回呼んでも例外を出さないこと', () => {
      component.selectedTable = null;
      expect(() => {
        component.toggleEditMode();
        component.toggleEditMode();
      }).not.toThrow();
    });
  });

  describe('SyncVar への reactivity', () => {
    // objectChanged$ は queueMicrotask 経由で batch 発火するため、書き込み後に flush してから読む。
    it('他 peer の編集で tableCommand が更新される', async () => {
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

    it('palettes() がペイレット変更で再評価される', async () => {
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
