import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import {
  buildTableColumnHeaderGroups,
  findGapCellInColumn,
  getCellLabel,
  getCellUnit,
  getSelectOptions,
  isCheckCellChecked,
  isGapColumn,
  isSelectValueListed,
  nextCheckCellValue,
  parseSelectChoices,
  type TableColumn,
} from '@axe/domain/data/table-layout';

function makeCell(name: string, value: string | number = ''): DataElement {
  const cell = DataElement.create(name, value);
  cell.setAttribute(DataElementAttribute.ROLE, 'field');
  return cell;
}

function makeColumn(name: string, kind: string = ''): TableColumn {
  return { name, label: name, group: '', kind };
}

describe('table-layout cell helpers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    const store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('isGapColumn()', () => {
    it("kind === 'gap' のときだけ true", () => {
      expect(isGapColumn(makeColumn('hp', 'gap'))).toBe(true);
      expect(isGapColumn(makeColumn('hp', ''))).toBe(false);
      expect(isGapColumn(makeColumn('hp', 'check'))).toBe(false);
    });
  });

  describe('isCheckCellChecked()', () => {
    it.each(['1', 'true', 'x', 'checked', 'TRUE', 'X', 'Checked'])('"%s" は ON とみなす', (value) => {
      const cell = makeCell('chk', value);
      expect(isCheckCellChecked(cell)).toBe(true);
    });
    it.each(['', '0', 'false', 'no', '2'])('"%s" は OFF', (value) => {
      const cell = makeCell('chk', value);
      expect(isCheckCellChecked(cell)).toBe(false);
    });
  });

  describe('nextCheckCellValue()', () => {
    it('event 由来の checkbox 値を優先する', () => {
      const cell = makeCell('chk', '1');
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = false;
      const ev = new Event('change');
      Object.defineProperty(ev, 'target', { value: inp });
      expect(nextCheckCellValue(cell, ev)).toBe(0);

      inp.checked = true;
      expect(nextCheckCellValue(cell, ev)).toBe(1);
    });

    it('event 無しなら現状の反転', () => {
      expect(nextCheckCellValue(makeCell('chk', '1'))).toBe(0);
      expect(nextCheckCellValue(makeCell('chk', ''))).toBe(1);
    });
  });

  describe('getCellLabel()', () => {
    it('CELL_TEXT 属性を trim して返す', () => {
      const cell = makeCell('chk');
      cell.setAttribute(DataElementAttribute.CELL_TEXT, '  習得済み  ');
      expect(getCellLabel(cell)).toBe('習得済み');
    });
    it('属性無しなら空文字', () => {
      expect(getCellLabel(makeCell('chk'))).toBe('');
    });
  });

  describe('getCellUnit()', () => {
    it('UNIT 属性ありなら先頭スペース付きで返す', () => {
      const cell = makeCell('hp');
      cell.setAttribute(DataElementAttribute.UNIT, '点');
      expect(getCellUnit(cell)).toBe(' 点');
    });
    it('UNIT 属性無しなら空文字（スペース無し）', () => {
      expect(getCellUnit(makeCell('hp'))).toBe('');
    });
  });

  describe('parseSelectChoices()', () => {
    it('改行とカンマの両方をセパレータにする', () => {
      expect(parseSelectChoices('a,b\nc,d')).toEqual(['a', 'b', 'c', 'd']);
    });
    it('空要素を除外', () => {
      expect(parseSelectChoices('a,,b\n\nc')).toEqual(['a', 'b', 'c']);
    });
    it('前後の空白を trim', () => {
      expect(parseSelectChoices(' a , b\n c ')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getSelectOptions() / isSelectValueListed()', () => {
    it('CHOICES 属性から選択肢を読み込み', () => {
      const cell = makeCell('sel', 'B');
      cell.setAttribute(DataElementAttribute.CHOICES, 'A,B,C');
      expect(getSelectOptions(cell)).toEqual(['A', 'B', 'C']);
      expect(isSelectValueListed(cell)).toBe(true);
    });
    it('現在値が選択肢に無いと false', () => {
      const cell = makeCell('sel', 'Z');
      cell.setAttribute(DataElementAttribute.CHOICES, 'A,B,C');
      expect(isSelectValueListed(cell)).toBe(false);
    });
  });

  describe('findGapCellInColumn()', () => {
    it('該当カラム位置の gap セルを最初の行から見つけて返す', () => {
      // 構造: parent → [row1[gapCell], row2[gapCell2]]
      const parent = DataElement.create('table', '');
      const row1 = DataElement.create('row1', '');
      const row2 = DataElement.create('row2', '');
      parent.appendChild(row1);
      parent.appendChild(row2);

      const gap1 = makeCell('mark', '');
      gap1.setAttribute(DataElementAttribute.CELL_KIND, 'gap');
      row1.appendChild(gap1);

      const gap2 = makeCell('mark', '');
      gap2.setAttribute(DataElementAttribute.CELL_KIND, 'gap');
      row2.appendChild(gap2);

      const found = findGapCellInColumn(parent, makeColumn('mark', 'gap'));
      expect(found).toBe(gap1);
    });

    it('gap カラム以外は常に null', () => {
      const parent = DataElement.create('table', '');
      expect(findGapCellInColumn(parent, makeColumn('mark', ''))).toBeNull();
    });
  });

  describe('buildTableColumnHeaderGroups()', () => {
    it('連続する同一 group/label を span でまとめる', () => {
      const cols: TableColumn[] = [
        { name: 'a', label: 'A', group: 'G1', kind: '' },
        { name: 'b', label: 'B', group: 'G1', kind: '' },
        { name: 'c', label: 'C', group: 'G2', kind: '' },
      ];
      const groups = buildTableColumnHeaderGroups(cols);
      expect(groups).toEqual([
        { key: '0:G1', label: 'G1', span: 2 },
        { key: '2:G2', label: 'G2', span: 1 },
      ]);
    });

    it('group 空のカラムは label をキーに使う', () => {
      const cols: TableColumn[] = [
        { name: 'a', label: 'Same', group: '', kind: '' },
        { name: 'b', label: 'Same', group: '', kind: '' },
      ];
      const groups = buildTableColumnHeaderGroups(cols);
      expect(groups).toEqual([{ key: '0:Same', label: 'Same', span: 2 }]);
    });
  });
});
