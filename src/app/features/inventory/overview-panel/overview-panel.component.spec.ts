import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { OverviewPanelComponent } from '@axe/features/inventory/overview-panel/overview-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('OverviewPanelComponent', () => {
  let component: OverviewPanelComponent;
  let fixture: ComponentFixture<OverviewPanelComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [OverviewPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('null要素のフィルタリング', () => {
    it('inventoryDataElmsがtabletopObject未設定時に空配列を返すこと', () => {
      component.tabletopObject = null!;
      expect(component.inventoryDataElms).toEqual([]);
    });

    it('dataElmsがtabletopObject未設定時に空配列を返すこと', () => {
      component.tabletopObject = null!;
      expect(component.dataElms).toEqual([]);
    });

    it('rangeElmsがtabletopObject未設定時に空配列を返すこと', () => {
      component.tabletopObject = null!;
      expect(component.rangeElms).toEqual([]);
    });

    it('dataElmsがchildren内のnull要素を除外すること', () => {
      const mockChildren = [null, { myIdentifer: 'a' }, null, { myIdentifer: 'b' }];
      component.tabletopObject = {
        detailDataElement: { children: mockChildren },
      } as unknown as TabletopObject;
      const result = component.dataElms;
      expect(result.length).toBe(2);
      expect(result.every((e) => e != null)).toBe(true);
    });

    it('rangeElmsがchildren内のnull要素を除外すること', () => {
      const mockChildren = [null, { myIdentifer: 'x' }];
      component.tabletopObject = {
        commonDataElement: { children: mockChildren },
      } as unknown as TabletopObject;
      const result = component.rangeElms;
      expect(result.length).toBe(1);
      expect(result[0]).toBeTruthy();
    });
  });

  describe('editCheckedIds による編集チェック状態管理', () => {
    it('changeChk で未登録のIDが追加されること', () => {
      component.changeChk('elem-1');
      expect(component.isEditUrl('elem-1')).toBe(true);
    });

    it('changeChk で登録済みのIDが削除されること', () => {
      component.changeChk('elem-1');
      component.changeChk('elem-1');
      expect(component.isEditUrl('elem-1')).toBe(false);
    });

    it('textFocus でIDが追加されること', () => {
      component.textFocus('elem-2');
      expect(component.isEditUrl('elem-2')).toBe(true);
    });
  });
});
