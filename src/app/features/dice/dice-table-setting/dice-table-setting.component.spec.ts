import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { DiceTableSettingComponent } from './dice-table-setting.component';

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
    it('selectedTable が null の状態で gameType getter が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.gameType).toBe('');
    });

    it('selectedTable が null の状態で tableName getter が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableName).toBe('');
    });

    it('selectedTable が null の状態で tableDice getter が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableDice).toBe('');
    });

    it('selectedTable が null の状態で tableCommand getter が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableCommand).toBe('');
    });

    it('selectedTable が null の状態で tableText getter が "" を返すこと', () => {
      component.selectedTable = null;
      expect(component.tableText).toBe('');
    });

    it('selectedTable が null の状態で diceTablePalette が null! を返さず安全に処理されること', () => {
      component.selectedTable = null;
      expect(() => {
        const _palette = component.diceTablePalette;
      }).not.toThrow();
    });

    it('selectedTable が null の状態で toggleEditMode() を呼んでも例外を出さないこと', () => {
      component.selectedTable = null;

      expect(() => component.toggleEditMode()).not.toThrow();
    });

    it('selectedTable が null の状態で toggleEditMode() を2回呼んでも例外を出さないこと', () => {
      component.selectedTable = null;

      expect(() => {
        component.toggleEditMode();
        component.toggleEditMode();
      }).not.toThrow();
    });
  });
});
