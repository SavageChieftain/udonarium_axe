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

// 迷宮キングダム（保管所 game="mk"）。NC1-8 の順序は作成ページ <th> ヘッダで確認。
// 主能力（判定に使う）= 才覚/魅力/探索/武勇、副次値 = 器/回避/配下/気力。
const PRIMARY: { key: string; label: string }[] = [
  { key: 'NC1', label: '才覚' },
  { key: 'NC2', label: '魅力' },
  { key: 'NC3', label: '探索' },
  { key: 'NC4', label: '武勇' },
];

const SECONDARY: { key: string; label: string }[] = [
  { key: 'NC5', label: '器' },
  { key: 'NC6', label: '回避' },
  { key: 'NC7', label: '配下' },
  { key: 'NC8', label: '気力' },
];

const SKILL_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'taisho', label: '対象' },
  { suffix: 'memo', label: '効果' },
  { suffix: 'shozoku', label: '所属' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'class_name', label: 'クラス' },
  { key: 'job1_name', label: 'ジョブ' },
  { key: 'jobginou_name', label: 'ジョブ技能' },
  { key: 'nation_name', label: '所属国家' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isMkCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'mk';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of [...PRIMARY, ...SECONDARY]) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
  }
  return params;
}

function buildSkillSection(record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record['ginou_name']);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    for (const column of SKILL_COLUMNS) {
      const cell = asArray(record[`ginou_${column.suffix}`])[index];
      if (!isNonEmptyScalar(cell)) continue;
      const classified = classifyScalar(cell);
      fields.push({ label: column.label, value: classified.value, kind: classified.kind });
    }
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: '技能', groups } : null;
}

function buildConneSection(record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record['conne_name']);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    for (const [suffix, label] of [
      ['like', '好意'],
      ['dislike', '敵意'],
    ] as const) {
      const cell = asArray(record[`conne_${suffix}`])[index];
      if (!isNonEmptyScalar(cell)) continue;
      const classified = classifyScalar(cell);
      fields.push({ label, value: classified.value, kind: classified.kind });
    }
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: 'コネ', groups } : null;
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
  const lines = PRIMARY.filter((ability) => isNonEmptyScalar(record[ability.key])).map(
    (ability) => `2MK+${asString(record[ability.key]).trim()} 【${ability.label}判定】`
  );
  return lines.join('\n');
}

export function buildMkCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isMkCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'MeikyuKingdom';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [buildSkillSection(record), buildConneSection(record), buildProfileSection(record)].filter(
    (section): section is ImportedSection => section != null
  );

  character.commands = buildPalette(record);

  return character;
}
