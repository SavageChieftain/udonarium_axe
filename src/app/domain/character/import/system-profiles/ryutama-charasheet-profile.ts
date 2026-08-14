import { normalizeImage } from '@axe/domain/character/import/charasheet-character-parser';
import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  isNonEmptyScalar,
  normalizeHexColor,
  profileSectionOf,
} from '@axe/domain/character/import/imported-character';
import { asArray, asString } from '@axe/domain/character/import/system-profiles/coc-charasheet-shared';

// りゅうたま（保管所 game="ryutama"）の4能力値。S{i}=サイコロの面数（d4/d6/…）。順序は作成ページの <th> ヘッダで確認。
const ABILITIES: { key: string; label: string }[] = [
  { key: 'S1', label: '体力' },
  { key: 'S2', label: '敏捷' },
  { key: 'S3', label: '知力' },
  { key: 'S4', label: '精神' },
];

const CLASS_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'hantei', label: '判定' },
  { suffix: 'taishou', label: '対象' },
  { suffix: 'kouka', label: '効果' },
];

const SPELL_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'mp', label: 'MP' },
  { suffix: 'time', label: 'タイミング' },
  { suffix: 'taisho', label: '対象' },
  { suffix: 'range', label: '射程' },
  { suffix: 'memo', label: '効果' },
];

const ITEM_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'life', label: '耐久' },
  { suffix: 'weight', label: '重量' },
  { suffix: 'price', label: '価格' },
  { suffix: 'memo', label: '効果' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'class_name', label: 'クラス' },
  { key: 'shuzoku_name', label: '種族' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isRyutamaCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'ryutama';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: `d${asString(record[ability.key]).trim()}` });
  }
  return params;
}

function zipSection(
  label: string,
  prefix: string,
  columns: { suffix: string; label: string }[],
  record: Record<string, unknown>
): ImportedSection | null {
  const names = asArray(record[`${prefix}_name`]);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    for (const column of columns) {
      const cell = asArray(record[`${prefix}_${column.suffix}`])[index];
      if (!isNonEmptyScalar(cell)) continue;
      const classified = classifyScalar(cell);
      fields.push({ label: column.label, value: classified.value, kind: classified.kind });
    }
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label, groups } : null;
}

function buildPalette(record: Record<string, unknown>): string {
  const lines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.key])).map(
    (ability) => `1d${asString(record[ability.key]).trim()} 【${ability.label}】`
  );
  return lines.join('\n');
}

export function buildRyutamaCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isRyutamaCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Ryutama';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [
    zipSection('クラス能力', 'cls', CLASS_COLUMNS, record),
    zipSection('呪文', 'spell', SPELL_COLUMNS, record),
    zipSection('所持品', 'item', ITEM_COLUMNS, record),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
