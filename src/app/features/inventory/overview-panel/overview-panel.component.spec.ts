import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
  DataElementViewMode,
} from '@axe/domain/data/data-element';
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

    it('inventoryDataElmsがDataElement側のポップアップ表示属性を追加表示すること', () => {
      const character = GameCharacter.create('popup-attribute-test', 1, '');
      const section = DataElement.create('追加情報', '', { [DataElementAttribute.ROLE]: DataElementRole.SECTION });
      const group = DataElement.create('基本', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      const field = DataElement.create('秘密', '静かな値', {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.POPUP]: 'true',
      });
      section.appendChild(group);
      group.appendChild(field);
      character.detailDataElement!.appendChild(section);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(component as unknown as { getInventoryTags: () => [] }, 'getInventoryTags');
      getInventoryTagsSpy.mockReturnValue([]);

      try {
        expect(component.inventoryDataElms).toEqual([field]);
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('親要素がポップアップ表示対象なら子要素を重複表示しないこと', () => {
      const character = GameCharacter.create('popup-parent-test', 1, '');
      const section = DataElement.create('公開情報', '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
        [DataElementAttribute.POPUP]: 'true',
      });
      const group = DataElement.create('基本', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      const field = DataElement.create('秘密', '静かな値', {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.POPUP]: 'true',
      });
      section.appendChild(group);
      group.appendChild(field);
      character.detailDataElement!.appendChild(section);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(component as unknown as { getInventoryTags: () => [] }, 'getInventoryTags');
      getInventoryTagsSpy.mockReturnValue([]);

      try {
        expect(component.inventoryDataElms).toEqual([section]);
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('DataElement側のポップアップ選択をインベントリタグ順ベースでマージすること', () => {
      const character = GameCharacter.create('popup-merge-test', 1, '');
      const inventoryField = DataElement.create('HP', '12', { [DataElementAttribute.ROLE]: DataElementRole.FIELD });
      const field = DataElement.create('公開メモ', '選択された値', {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.POPUP]: 'true',
      });
      character.detailDataElement!.appendChild(field);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(
        component as unknown as { getInventoryTags: () => DataElement[] },
        'getInventoryTags'
      );
      getInventoryTagsSpy.mockReturnValue([inventoryField]);

      try {
        expect(component.inventoryDataElms).toEqual([inventoryField, field]);
      } finally {
        getInventoryTagsSpy.mockRestore();
        inventoryField.destroy();
        character.destroy();
      }
    });

    it('ポップアップ選択した親要素は最初に現れる子インベントリタグの位置へ配置すること', () => {
      const character = GameCharacter.create('popup-parent-order-test', 1, '');
      const section = DataElement.create('リソース', '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
        [DataElementAttribute.POPUP]: 'true',
      });
      const group = DataElement.create('基本', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      const hp = DataElement.create('HP', '12', { [DataElementAttribute.ROLE]: DataElementRole.FIELD });
      const mp = DataElement.create('MP', '8', { [DataElementAttribute.ROLE]: DataElementRole.FIELD });
      const memo = DataElement.create('メモ', '後続', { [DataElementAttribute.ROLE]: DataElementRole.FIELD });
      section.appendChild(group);
      group.appendChild(hp);
      group.appendChild(mp);
      character.detailDataElement!.appendChild(section);
      character.detailDataElement!.appendChild(memo);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(
        component as unknown as { getInventoryTags: () => DataElement[] },
        'getInventoryTags'
      );
      getInventoryTagsSpy.mockReturnValue([hp, mp, memo]);

      try {
        expect(component.inventoryDataElms).toEqual([section, memo]);
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('ポップアップ対象のテーブルビューを表として描画すること', () => {
      const character = GameCharacter.create('popup-table-test', 1, '');
      const table = DataElement.create('技能表', '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
        [DataElementAttribute.VIEW_MODE]: DataElementViewMode.TABLE,
        [DataElementAttribute.POPUP]: 'true',
      });
      const row = DataElement.create('身体', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      const checkCell = DataElement.create('運動', 1, {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
      });
      const textCell = DataElement.create('備考', '軽やか', {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
      });
      const gapCell = DataElement.create('ギャップ1', 0, {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
        [DataElementAttribute.CELL_KIND]: 'gap',
        [DataElementAttribute.CELL_TEXT]: '身体-技術',
        [DataElementAttribute.COLUMN_LABEL]: 'G',
      });
      row.appendChild(checkCell);
      row.appendChild(gapCell);
      row.appendChild(textCell);
      table.appendChild(row);
      character.detailDataElement!.appendChild(table);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(component as unknown as { getInventoryTags: () => [] }, 'getInventoryTags');
      getInventoryTagsSpy.mockReturnValue([]);

      try {
        fixture.detectChanges();
        const tableElement = fixture.nativeElement.querySelector('.overview-table') as HTMLTableElement | null;
        expect(tableElement).toBeTruthy();
        expect(tableElement?.textContent).toContain('身体');
        expect(tableElement?.textContent).toContain('運動');
        expect(fixture.nativeElement.querySelector('.overview-table-gap-toggle input[type="checkbox"]')).toBeTruthy();
        expect(tableElement?.textContent).toContain('軽やか');
        expect(fixture.nativeElement.querySelector('.overview-table-column--gap')).toBeTruthy();
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('ポップアップテーブルは列グループ、行見出し、選択セルを描画すること', () => {
      const character = GameCharacter.create('popup-table-type2-test', 1, '');
      const table = DataElement.create('技能表タイプ2', '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
        [DataElementAttribute.VIEW_MODE]: DataElementViewMode.TABLE,
        [DataElementAttribute.POPUP]: 'true',
        [DataElementAttribute.ROW_HEADER_LABEL]: '技能',
      });
      const row = DataElement.create('行1', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      row.appendChild(
        DataElement.create('肉体技能名', '肉体攻撃', {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
          [DataElementAttribute.COLUMN_LABEL]: '技能',
          [DataElementAttribute.COLUMN_GROUP]: '肉体技能',
        })
      );
      const rankCell = DataElement.create('肉体技能習熟度', '初級', {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.SELECT,
        [DataElementAttribute.CHOICES]: '初級,中級,上級',
        [DataElementAttribute.COLUMN_LABEL]: '習熟度',
        [DataElementAttribute.COLUMN_GROUP]: '肉体技能',
      });
      row.appendChild(rankCell);
      table.appendChild(row);
      character.detailDataElement!.appendChild(table);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(component as unknown as { getInventoryTags: () => [] }, 'getInventoryTags');
      getInventoryTagsSpy.mockReturnValue([]);

      try {
        fixture.detectChanges();
        const groupHeader = fixture.nativeElement.querySelector('.overview-table-column-group') as HTMLElement | null;
        const rowHeader = fixture.nativeElement.querySelector(
          '.overview-table-row-heading--group'
        ) as HTMLElement | null;
        const select = fixture.nativeElement.querySelector('.overview-table-select') as HTMLSelectElement | null;
        expect(groupHeader?.textContent?.trim()).toBe('肉体技能');
        expect(groupHeader?.getAttribute('colspan')).toBe('2');
        expect(rowHeader?.textContent?.trim()).toBe('技能');
        expect(fixture.nativeElement.textContent).toContain('肉体攻撃');
        expect(select?.value).toBe('初級');

        select!.value = '上級';
        select!.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(rankCell.value).toBe('上級');
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('ポップアップテーブルはギャップ制御行を表示せず列クリックで状態を切り替えること', () => {
      const character = GameCharacter.create('popup-gap-table-test', 1, '');
      const table = DataElement.create('技能表', '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
        [DataElementAttribute.VIEW_MODE]: DataElementViewMode.TABLE,
        [DataElementAttribute.POPUP]: 'true',
      });
      const gapRow = DataElement.create('ギャップ', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      gapRow.appendChild(
        DataElement.create('技巧', '', {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
          [DataElementAttribute.COLUMN_LABEL]: '技巧',
        })
      );
      gapRow.appendChild(
        DataElement.create('ギャップ1', 0, {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
          [DataElementAttribute.CELL_KIND]: 'gap',
          [DataElementAttribute.CELL_TEXT]: '技巧-身体',
          [DataElementAttribute.COLUMN_LABEL]: 'G',
        })
      );
      gapRow.appendChild(
        DataElement.create('身体', '', {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
          [DataElementAttribute.COLUMN_LABEL]: '身体',
        })
      );
      const gapCell = gapRow.getFirstElementByName('ギャップ1')!;
      const row = DataElement.create('2', '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
      row.appendChild(
        DataElement.create('技巧', 1, {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
          [DataElementAttribute.CELL_TEXT]: '解錠',
        })
      );
      row.appendChild(
        DataElement.create('身体', 0, {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
          [DataElementAttribute.CELL_TEXT]: '跳躍',
        })
      );
      table.appendChild(gapRow);
      table.appendChild(row);
      character.detailDataElement!.appendChild(table);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(component as unknown as { getInventoryTags: () => [] }, 'getInventoryTags');
      getInventoryTagsSpy.mockReturnValue([]);

      try {
        fixture.detectChanges();
        const tableElement = fixture.nativeElement.querySelector('.overview-table') as HTMLTableElement | null;
        const gapHeader = fixture.nativeElement.querySelector('th.overview-table-column--gap') as HTMLElement | null;
        expect(gapHeader?.querySelector('input[type="checkbox"]')).toBeTruthy();
        expect(tableElement?.textContent).not.toContain('ギャップ');
        expect(tableElement?.textContent).not.toContain('技巧-身体');
        expect(tableElement?.textContent).toContain('解錠');

        gapHeader?.click();
        fixture.detectChanges();

        expect(gapCell.value).toBe(1);
        expect(fixture.nativeElement.querySelector('.overview-table-column--gap-active')).toBeTruthy();
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('ポップアップのリソース表示にrangeを描画しないこと', () => {
      const character = GameCharacter.create('popup-resource-test', 1, '');
      const resource = DataElement.create('HP', 20, {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.POPUP]: 'true',
      });
      resource.type = DataElementType.NUMBER_RESOURCE;
      resource.currentValue = 10;
      character.detailDataElement!.appendChild(resource);
      component.tabletopObject = character;
      const getInventoryTagsSpy = vi.spyOn(component as unknown as { getInventoryTags: () => [] }, 'getInventoryTags');
      getInventoryTagsSpy.mockReturnValue([]);

      try {
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('input[type="range"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('input[type="number"]')).toBeTruthy();
      } finally {
        getInventoryTagsSpy.mockRestore();
        character.destroy();
      }
    });

    it('ポップアップの通常リソース現在値は暗い固定色を使わないこと', () => {
      const hp = DataElement.create('HP', 200, { type: DataElementType.NUMBER_RESOURCE });
      hp.currentValue = 200;

      try {
        expect(component.getPopupCurrentValueColor(hp)).toBeNull();
      } finally {
        hp.destroy();
      }
    });

    it('ポップアップのSAN警告色は保持すること', () => {
      const san = DataElement.create('SAN', 100, { type: DataElementType.NUMBER_RESOURCE });
      san.currentValue = 80;

      try {
        expect(component.getPopupCurrentValueColor(san)).toBe('#d22');
      } finally {
        san.destroy();
      }
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
