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
  /** The name of the section, which is also the prefix of every element identifier in it. */
  name: string;
  /** The names of the categories, of which that family of systems has six. */
  categories: string[];
  /** The skill in each row of each category, every category as long as the row names. */
  skillsByCategory: string[][];
  /** The suffix that makes the identifiers predictable, usually the character's own. Empty to let them be generated. */
  idSuffix?: string;
  /** The row labels, by default the eleven from two to twelve. */
  rowNames?: string[];
  /** Whether each skill was learnt. Unset, none of them was. */
  checked?: boolean[][];
  /**
   * Whether each gap in the ring was learnt, one for each category.
   * Each gap but the last sits between one category and the next.
   * The last wraps from the final category round to the first, and sits at the head of the row.
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
 * Builds the gapped skill table of that family of systems, and nothing else.
 * The sample character and an imported one share it.
 * A section shown as a table, holding the gap row and one row for each rank.
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

  // the wrapping gap, from the last category back to the first, goes at the head of the row
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
