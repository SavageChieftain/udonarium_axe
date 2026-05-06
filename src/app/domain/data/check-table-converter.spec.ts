import {
  convertLegacyCheckTableElements,
  countConvertibleCheckTableElements,
  createStructuredCheckTableElement,
  parseCheckTable,
  toggleCheckbox,
} from '@axe/domain/data/check-table-converter';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
  DataElementViewMode,
} from '@axe/domain/data/data-element';

describe('parseCheckTable', () => {
  it('空文字列は空ブロック配列を返すこと', () => {
    const blocks = parseCheckTable('');
    expect(blocks).toEqual([{ kind: 'plain', tokens: [] }]);
  });

  it('テキストのみの行を plain ブロックとして返すこと', () => {
    const blocks = parseCheckTable('テーブル表');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('plain');
    expect((blocks[0] as { tokens: { kind: string; text: string }[] }).tokens[0]).toEqual({
      kind: 'text',
      text: 'テーブル表',
    });
  });

  it('パイプ区切り行を table ブロックとして返すこと', () => {
    const blocks = parseCheckTable('|A|B|');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('table');
  });

  it('チェックボックス [] をトークンとしてパースすること', () => {
    const blocks = parseCheckTable('[]テスト');
    const tokens = (blocks[0] as { tokens: { kind: string }[] }).tokens;
    expect(tokens[0].kind).toBe('check');
    expect((tokens[0] as { kind: string; checked: boolean }).checked).toBe(false);
  });

  it('チェック済み [x] をパースすること', () => {
    const blocks = parseCheckTable('[x]テスト');
    const tokens = (blocks[0] as { tokens: { kind: string }[] }).tokens;
    expect((tokens[0] as { kind: string; checked: boolean }).checked).toBe(true);
  });

  it('連続するチェックボックスに連番インデックスを付与すること', () => {
    const blocks = parseCheckTable('[][]');
    const tokens = (blocks[0] as { tokens: { kind: string; idx: number }[] }).tokens;
    expect(tokens[0].idx).toBe(0);
    expect(tokens[1].idx).toBe(1);
  });

  it('テーブル行をまたいでインデックスが連番になること', () => {
    const blocks = parseCheckTable('|[]A|[]B|\n[]C');
    const table = blocks[0] as { kind: string; rows: { cells: { kind: string; idx: number }[][] }[] };
    expect(table.rows[0].cells[0][0]).toMatchObject({ kind: 'check', idx: 0 });
    expect(table.rows[0].cells[1][0]).toMatchObject({ kind: 'check', idx: 1 });
    const plain = blocks[1] as { tokens: { kind: string; idx: number }[] };
    expect(plain.tokens[0]).toMatchObject({ kind: 'check', idx: 2 });
  });
});

describe('toggleCheckbox', () => {
  it('指定インデックスの [] を [x] に変換すること', () => {
    expect(toggleCheckbox('[][]', 0)).toBe('[x][]');
  });

  it('指定インデックスの [x] を [] に変換すること', () => {
    expect(toggleCheckbox('[x][]', 0)).toBe('[][]');
  });

  it('他のチェックボックスには影響しないこと', () => {
    expect(toggleCheckbox('[x][][x]', 1)).toBe('[x][x][x]');
  });

  it('全角 [ｘ] も [] に変換できること', () => {
    expect(toggleCheckbox('[ｘ]', 0)).toBe('[]');
  });
});

describe('createStructuredCheckTableElement', () => {
  it('markdownテーブルを表示用DataElementテーブルへ変換すること', () => {
    const table = createStructuredCheckTableElement('汎用表', '|項目|済み|点数|\n|灯火|[x]|2|');
    const row = table.children[0];
    const check = row.getFirstElementByName('済み');

    expect(table.fieldRole).toBe(DataElementRole.SECTION);
    expect(table.viewMode).toBe(DataElementViewMode.TABLE);
    expect(row.fieldRole).toBe(DataElementRole.GROUP);
    expect(row.getFirstElementByName('項目')?.value).toBe('灯火');
    expect(check?.fieldType).toBe(DataElementFieldType.CHECK);
    expect(check?.value).toBe(1);
    expect(row.getFirstElementByName('点数')?.value).toBe('2');
  });

  it('チェック付きセルの表示テキストを cellText に保持すること', () => {
    const table = createStructuredCheckTableElement('技能表', 'テーブル表\n|[]|[]身体||\n|　|[]跳躍|2|');
    const row = table.children[0];
    const skill = row.getFirstElementByName('身体');

    expect(row.name).toBe('2');
    expect(skill?.fieldType).toBe(DataElementFieldType.CHECK);
    expect(skill?.getAttribute(DataElementAttribute.CELL_TEXT)).toBe('跳躍');
  });
});

describe('convertLegacyCheckTableElements', () => {
  it('旧チェック表フィールドを構造化テーブルに変換すること', () => {
    const detail = DataElement.create('detail', '');
    const section = DataElement.create('情報', '', { role: DataElementRole.SECTION });
    const group = DataElement.create('基本', '', { role: DataElementRole.GROUP });
    const legacy = DataElement.create('旧表', '|項目|済み|\n|灯火|[x]|', {
      role: DataElementRole.FIELD,
      fieldType: DataElementFieldType.CHECK_TABLE,
      type: DataElementType.CHECK_TABLE,
    });
    detail.appendChild(section);
    section.appendChild(group);
    group.appendChild(legacy);

    expect(countConvertibleCheckTableElements(detail)).toBe(1);

    const convertedCount = convertLegacyCheckTableElements(detail);
    const converted = detail.getFirstElementByName('旧表')!;

    expect(convertedCount).toBe(1);
    expect(countConvertibleCheckTableElements(detail)).toBe(0);
    expect(converted.fieldRole).toBe(DataElementRole.SECTION);
    expect(converted.viewMode).toBe(DataElementViewMode.TABLE);
    expect(converted.children[0].getFirstElementByName('済み')?.value).toBe(1);
    expect(group.getFirstElementByName('旧表')).toBeNull();
  });
});
