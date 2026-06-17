import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
  DataElementViewMode,
} from '@axe/domain/data/data-element';

export const DEFAULT_SKILL_TABLE_ROW_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export interface SkillGapTableInput {
  /** セクション名（例: '技能表' / '特技表'）。要素 identifier の接頭辞も兼ねる。 */
  name: string;
  /** カテゴリ名（サイフィクは 6 列）。 */
  categories: string[];
  /** [カテゴリ][行] の特技名。各カテゴリは rowNames と同じ長さ。 */
  skillsByCategory: string[][];
  /** identifier を決定的にするための接尾辞（通常はキャラ identifier）。空なら uuid 任せ。 */
  idSuffix?: string;
  /** 行ラベル（既定は 2〜12 の 11 行）。 */
  rowNames?: string[];
  /** [カテゴリ][行] の習得フラグ。未指定は全て未習得。 */
  checked?: boolean[][];
  /**
   * リング状ギャップの習得フラグ。長さ = カテゴリ数。
   * gaps[i] (i=0..len-2) = categories[i] と categories[i+1] の間（ギャップ{i+1}）。
   * gaps[len-1] = categories[len-1] と categories[0] のラップアラウンド（ギャップ{len}、行頭に配置）。
   */
  gaps?: boolean[];
}

function makeId(idSuffix: string, suffix: string): string {
  return idSuffix === '' ? '' : `${suffix}_${idSuffix}`;
}

function gapField(name: string, cellText: string, checked: boolean, identifier: string): DataElement {
  return DataElement.create(
    name,
    checked ? 1 : 0,
    {
      [DataElementAttribute.ROLE]: DataElementRole.FIELD,
      [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
      [DataElementAttribute.CELL_TEXT]: cellText,
      [DataElementAttribute.COLUMN_LABEL]: 'G',
      [DataElementAttribute.CELL_KIND]: 'gap',
      type: DataElementType.CHECK,
    },
    identifier
  );
}

/**
 * サイフィク系の「ギャップ付き異能表（特技表）」を生成する純粋ビルダー。
 * サンプルキャラの技能表（CharacterTemplateFactory）と取り込みキャラで共用する。
 * 構造: section(viewMode=TABLE) > 「ギャップ」行 + 各行(2〜12)。
 */
export function createSkillGapTableElement(input: SkillGapTableInput): DataElement {
  const { name, categories, skillsByCategory } = input;
  const idSuffix = input.idSuffix ?? '';
  const rowNames = input.rowNames ?? DEFAULT_SKILL_TABLE_ROW_NAMES;
  const checked = input.checked;
  const gaps = input.gaps;
  const lastIndex = categories.length - 1;

  const tableElement = DataElement.create(
    name,
    '',
    {
      'cs-colspan': '2',
      [DataElementAttribute.ROLE]: DataElementRole.SECTION,
      [DataElementAttribute.VIEW_MODE]: DataElementViewMode.TABLE,
    },
    makeId(idSuffix, name)
  );

  const gapRowElement = DataElement.create(
    'ギャップ',
    '',
    { [DataElementAttribute.ROLE]: DataElementRole.GROUP },
    makeId(idSuffix, `${name}ギャップ`)
  );
  tableElement.appendChild(gapRowElement);

  // ラップアラウンドのギャップ（最後→最初）を行頭に置く
  gapRowElement.appendChild(
    gapField(
      `ギャップ${categories.length}`,
      `${categories[lastIndex]}-${categories[0]}`,
      gaps?.[lastIndex] ?? false,
      makeId(idSuffix, `${name}ギャップ${categories.length}`)
    )
  );

  for (const [categoryIndex, category] of categories.entries()) {
    gapRowElement.appendChild(
      DataElement.create(
        category,
        '',
        {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
          [DataElementAttribute.COLUMN_LABEL]: category,
        },
        makeId(idSuffix, `${name}ギャップ_${category}`)
      )
    );
    const nextCategory = categories[categoryIndex + 1];
    if (nextCategory === undefined) continue;
    gapRowElement.appendChild(
      gapField(
        `ギャップ${categoryIndex + 1}`,
        `${category}-${nextCategory}`,
        gaps?.[categoryIndex] ?? false,
        makeId(idSuffix, `${name}ギャップ${categoryIndex + 1}`)
      )
    );
  }

  for (const [rowIndex, rowName] of rowNames.entries()) {
    const rowElement = DataElement.create(
      rowName,
      '',
      { [DataElementAttribute.ROLE]: DataElementRole.GROUP },
      makeId(idSuffix, `${name}${rowName}`)
    );
    tableElement.appendChild(rowElement);
    for (const [categoryIndex, category] of categories.entries()) {
      const isChecked = checked?.[categoryIndex]?.[rowIndex] ?? false;
      rowElement.appendChild(
        DataElement.create(
          category,
          isChecked ? 1 : 0,
          {
            [DataElementAttribute.ROLE]: DataElementRole.FIELD,
            [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
            [DataElementAttribute.CELL_TEXT]: skillsByCategory[categoryIndex]?.[rowIndex] ?? '',
            [DataElementAttribute.COLUMN_LABEL]: category,
            type: DataElementType.CHECK,
          },
          makeId(idSuffix, `${name}${rowName}_${category}`)
        )
      );
    }
  }

  return tableElement;
}
