import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterType, GridType } from '@axe/domain/tabletop/game-table';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameTableSettingComponent } from './game-table-setting.component';

describe('GameTableSettingComponent', () => {
  let component: GameTableSettingComponent;
  let fixture: ComponentFixture<GameTableSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableSettingComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('OnPushコンポーネントでChangeDetectorRefが注入されていること', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  describe('selectedTableがnullの場合', () => {
    beforeEach(() => {
      component.selectedTable = null;
    });

    it('detectChangesがエラーにならないこと', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('getterがデフォルト値を返すこと', () => {
      expect(component.tableName).toBe('');
      expect(component.tableWidth).toBe(10);
      expect(component.tableHeight).toBe(10);
      expect(component.tableGridColor).toBe('#000000');
      expect(component.tableGridType).toBe(0 as GridType);
      expect(component.tableDistanceviewFilter).toBe(FilterType.NONE);
    });

    it('setterがエラーにならないこと', () => {
      expect(() => {
        component.tableName = 'test';
        component.tableWidth = 20;
        component.tableHeight = 20;
        component.tableGridColor = '#ffffff';
        component.tableGridType = 1 as GridType;
        component.tableDistanceviewFilter = FilterType.WHITE;
      }).not.toThrow();
    });
  });
});
