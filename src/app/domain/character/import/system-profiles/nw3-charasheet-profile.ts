import { normalizeImage } from '@axe/domain/character/import/charasheet-character-parser';
import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  normalizeHexColor,
} from '@axe/domain/character/import/imported-character';
import {
  asArray,
  asString,
  isNonEmptyScalar,
} from '@axe/domain/character/import/system-profiles/coc-charasheet-shared';

// ナイトウィザード3rd（保管所 game="nw3"）の能力値。S1-8 の順序は作成ページ <th> ヘッダで確認。
const ABILITIES: { key: string; label: string }[] = [
  { key: 'S1', label: '筋力' },
  { key: 'S2', label: '器用' },
  { key: 'S3', label: '感覚' },
  { key: 'S4', label: '理知' },
  { key: 'S5', label: '意思' },
  { key: 'S6', label: '幸運' },
  { key: 'S7', label: '耐久' },
  { key: 'S8', label: '魔法' },
];

const EFFECT_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'lv', label: 'レベル' },
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'hantei', label: '判定' },
  { suffix: 'taisho', label: '対象' },
  { suffix: 'range', label: '射程' },
  { suffix: 'cost', label: '代償' },
  { suffix: 'shozoku', label: 'クラス' },
  { suffix: 'memo', label: '効果' },
];

const WEAPON_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'range', label: '射程' },
  { suffix: 'memory', label: '記憶' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'level', label: 'レベル' },
  { key: 'class1_name', label: 'クラス1' },
  { key: 'class2_name', label: 'クラス2' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isNw3CharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'nw3';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
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

function buildProfileSection(record: Record<string, unknown>): ImportedSection | null {
  const fields: ImportedField[] = [];
  for (const field of PROFILE_FIELDS) {
    if (!isNonEmptyScalar(record[field.key])) continue;
    const classified = classifyScalar(record[field.key] as string | number);
    fields.push({ label: field.label, value: classified.value, kind: classified.kind });
  }
  return fields.length > 0 ? { label: 'プロフィール', groups: [{ label: '基本', fields }] } : null;
}

function buildPalette(record: Record<string, unknown>): string {
  const lines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.key])).map(
    (ability) => `${asString(record[ability.key]).trim()}NW 【${ability.label}】`
  );
  return lines.join('\n');
}

export function buildNw3CharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isNw3CharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'NightWizard3rd';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [
    zipSection('特技', 'effect', EFFECT_COLUMNS, record),
    zipSection('武器', 'arms', WEAPON_COLUMNS, record),
    buildProfileSection(record),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
