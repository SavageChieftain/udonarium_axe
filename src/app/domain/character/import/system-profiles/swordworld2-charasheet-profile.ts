import { normalizeImage } from '@axe/domain/character/import/charasheet-character-parser';
import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  ImportedStatus,
  normalizeHexColor,
  toFiniteNumber,
} from '@axe/domain/character/import/imported-character';
import {
  asArray,
  asString,
  isNonEmptyScalar,
} from '@axe/domain/character/import/system-profiles/coc-charasheet-shared';

// ソードワールド2.0（保管所 game="swordworld2"）の能力ボーナス。NB{i} = 各能力値ボーナス（判定に使用）。順序は標準。
const ABILITY_BONUSES: { key: string; label: string }[] = [
  { key: 'NB1', label: '器用B' },
  { key: 'NB2', label: '敏捷B' },
  { key: 'NB3', label: '筋力B' },
  { key: 'NB4', label: '生命力B' },
  { key: 'NB5', label: '知力B' },
  { key: 'NB6', label: '精神B' },
];

const SKILL_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'lv', label: 'レベル' },
  { suffix: 'kouka', label: '効果' },
  { suffix: 'zentei', label: '前提' },
];

const WEAPON_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'cate', label: 'カテゴリ' },
  { suffix: 'yoho', label: '用法' },
  { suffix: 'hit', label: '命中' },
  { suffix: 'iryoku', label: '威力' },
  { suffix: 'critical', label: 'C値' },
  { suffix: 'damage', label: '追加ダメージ' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'shuzoku', label: '種族' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isSwordWorld2CharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'swordworld2';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITY_BONUSES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
  }
  return params;
}

function buildStatuses(record: Record<string, unknown>): ImportedStatus[] {
  const statuses: ImportedStatus[] = [];
  for (const [key, label] of [
    ['HP', 'HP'],
    ['MP', 'MP'],
  ] as const) {
    if (isNonEmptyScalar(record[key])) {
      const value = toFiniteNumber(record[key], 0);
      statuses.push({ label, value, max: value });
    }
  }
  return statuses;
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

function buildPalette(record: Record<string, unknown>, params: ImportedParam[]): string {
  const lines: string[] = ['2d6 【判定】'];

  const abilityLines = ABILITY_BONUSES.filter((ability) => params.some((param) => param.label === ability.label)).map(
    (ability) => `2d6+{${ability.label}} 【${ability.label.replace('B', '')}判定】`
  );
  if (abilityLines.length > 0) lines.push('◆能力値', ...abilityLines);

  const names = asArray(record['arms_name']);
  const weaponLines: string[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const power = asString(asArray(record['arms_iryoku'])[index]).trim();
    if (power === '') return;
    const crit = toFiniteNumber(asArray(record['arms_critical'])[index], 10);
    const damage = toFiniteNumber(asArray(record['arms_damage'])[index], 0);
    weaponLines.push(`K${power}@${crit}${damage ? `+${damage}` : ''} 【${name} 打撃】`);
  });
  if (weaponLines.length > 0) lines.push('◆武器', ...weaponLines);

  return lines.join('\n');
}

export function buildSwordWorld2CharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isSwordWorld2CharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'SwordWorld2.0';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  const params = buildParams(record);
  character.params = params;
  character.statuses = buildStatuses(record);
  character.sections = [
    zipSection('技能', 'ST', SKILL_COLUMNS, record),
    zipSection('武器', 'arms', WEAPON_COLUMNS, record),
    buildProfileSection(record),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record, params);

  return character;
}
