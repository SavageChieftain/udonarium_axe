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

interface SkillCategory {
  prefix: string;
  label: string;
  names: string[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    prefix: 'TBA',
    label: '戦闘技能',
    names: [
      '回避',
      'キック',
      '組み付き',
      'こぶし(パンチ)',
      '頭突き',
      '投擲',
      'マーシャルアーツ',
      '拳銃',
      'サブマシンガン',
      'ショットガン',
      'マシンガン',
      'ライフル',
    ],
  },
  {
    prefix: 'TFA',
    label: '探索技能',
    names: [
      '応急手当',
      '鍵開け',
      '隠す',
      '隠れる',
      '聞き耳',
      '忍び歩き',
      '写真術',
      '精神分析',
      '追跡',
      '登攀',
      '図書館',
      '目星',
    ],
  },
  {
    prefix: 'TAA',
    label: '行動技能',
    names: ['運転', '機械修理', '重機械操作', '乗馬', '水泳', '製作', '操縦', '跳躍', '電気修理', 'ナビゲート', '変装'],
  },
  {
    prefix: 'TCA',
    label: '交渉技能',
    names: ['言いくるめ', '信用', '説得', '値切り', '母国語'],
  },
  {
    prefix: 'TKA',
    label: '知識技能',
    names: [
      '医学',
      'オカルト',
      '化学',
      'クトゥルフ神話',
      '芸術',
      '経理',
      '考古学',
      'コンピューター',
      '心理学',
      '人類学',
      '生物学',
      '地質学',
      '電子工学',
      '天文学',
      '博物学',
      '物理学',
      '法律',
      '薬学',
      '歴史',
    ],
  },
];

const ABILITIES: { key: string; label: string }[] = [
  { key: 'NA1', label: 'STR' },
  { key: 'NA2', label: 'CON' },
  { key: 'NA3', label: 'POW' },
  { key: 'NA4', label: 'DEX' },
  { key: 'NA5', label: 'APP' },
  { key: 'NA6', label: 'SIZ' },
  { key: 'NA7', label: 'INT' },
  { key: 'NA8', label: 'EDU' },
];

const DERIVED: { key: string; label: string }[] = [
  { key: 'NA12', label: 'アイデア' },
  { key: 'NA11', label: '幸運' },
  { key: 'NA14', label: '知識' },
];

const WEAPON_COLUMNS: { key: string; label: string }[] = [
  { key: 'arms_hit', label: '成功率' },
  { key: 'arms_damage', label: 'ダメージ' },
  { key: 'arms_range', label: '射程' },
  { key: 'arms_attack_count', label: '攻撃回数' },
  { key: 'arms_last_shot', label: '装弾数' },
  { key: 'arms_vitality', label: '耐久力' },
  { key: 'arms_sonota', label: 'その他' },
];

const ITEM_COLUMNS: { key: string; label: string }[] = [
  { key: 'item_tanka', label: '単価' },
  { key: 'item_num', label: '個数' },
  { key: 'item_price', label: '価格' },
  { key: 'item_memo', label: 'メモ' },
];

const EXCLUDED_KEYS = new Set([
  'pc_name',
  'color',
  'base64Image',
  'url',
  'pc_making_environ',
  'pc_id',
  'password',
  'pc_password',
  'game',
  'dmg_bonus',
  'SAN_Left',
  'SAN_Max',
  'SAN_Danger',
]);

interface CocSkill {
  category: string;
  name: string;
  value: number;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function isNonEmptyScalar(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isStructuredKey(key: string): boolean {
  return (
    EXCLUDED_KEYS.has(key) ||
    /^NA\d+$/.test(key) ||
    /^(NP|NS|NM)\d+$/.test(key) ||
    /^T(BA|FA|AA|CA|KA)/.test(key) ||
    key.startsWith('arms_') ||
    key.startsWith('item_')
  );
}

export function isCoc6CharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'coc';
}

function buildStatuses(record: Record<string, unknown>): ImportedStatus[] {
  const statuses: ImportedStatus[] = [];
  if (isNonEmptyScalar(record['SAN_Max'])) {
    const max = toFiniteNumber(record['SAN_Max'], 0);
    const left = isNonEmptyScalar(record['SAN_Left']) ? toFiniteNumber(record['SAN_Left'], max) : max;
    statuses.push({ label: '正気度', value: left, max });
  }
  if (isNonEmptyScalar(record['NA9'])) {
    const hp = toFiniteNumber(record['NA9'], 0);
    statuses.push({ label: 'HP', value: hp, max: hp });
  }
  if (isNonEmptyScalar(record['NA10'])) {
    const mp = toFiniteNumber(record['NA10'], 0);
    statuses.push({ label: 'MP', value: mp, max: mp });
  }
  return statuses;
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
  }
  for (const derived of DERIVED) {
    if (isNonEmptyScalar(record[derived.key]))
      params.push({ label: derived.label, value: asString(record[derived.key]) });
  }
  return params;
}

function collectSkills(record: Record<string, unknown>): CocSkill[] {
  const skills: CocSkill[] = [];
  for (const category of SKILL_CATEGORIES) {
    const totals = asArray(record[`${category.prefix}P`]);
    const bases = asArray(record[`${category.prefix}D`]);
    const customNames = asArray(record[`${category.prefix}Name`]);
    const rowCount = Math.max(totals.length, bases.length, category.names.length + customNames.length);

    for (let i = 0; i < rowCount; i++) {
      const name =
        i < category.names.length ? category.names[i] : asString(customNames[i - category.names.length]).trim();
      if (name === '') continue;

      const total = toFiniteNumber(totals[i], NaN);
      const base = toFiniteNumber(bases[i], NaN);
      const value = Number.isFinite(total) ? total : base;
      if (!Number.isFinite(value)) continue;

      skills.push({ category: category.label, name, value });
    }
  }
  return skills;
}

function buildSkillSection(skills: CocSkill[]): ImportedSection | null {
  if (skills.length === 0) return null;
  const groupsByCategory = new Map<string, ImportedField[]>();
  for (const skill of skills) {
    const fields = groupsByCategory.get(skill.category) ?? [];
    fields.push({ label: skill.name, value: skill.value, kind: 'number' });
    groupsByCategory.set(skill.category, fields);
  }
  const groups: ImportedGroup[] = [...groupsByCategory.entries()].map(([label, fields]) => ({ label, fields }));
  return { label: '技能', groups };
}

function buildParallelSection(
  label: string,
  nameKey: string,
  columns: { key: string; label: string }[],
  record: Record<string, unknown>
): ImportedSection | null {
  const names = asArray(record[nameKey]);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    for (const column of columns) {
      const cell = asArray(record[column.key])[index];
      if (!isNonEmptyScalar(cell)) continue;
      const classified = classifyScalar(cell);
      fields.push({ label: column.label, value: classified.value, kind: classified.kind });
    }
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label, groups } : null;
}

function buildOtherSection(record: Record<string, unknown>): ImportedSection | null {
  const fields: ImportedField[] = [];
  for (const [key, raw] of Object.entries(record)) {
    if (isStructuredKey(key) || Array.isArray(raw) || !isNonEmptyScalar(raw)) continue;
    const classified = classifyScalar(raw);
    fields.push({ label: key, value: classified.value, kind: classified.kind });
  }
  return fields.length > 0 ? { label: 'その他', groups: [{ label: '基本', fields }] } : null;
}

function buildPalette(
  params: ImportedParam[],
  statuses: ImportedStatus[],
  skills: CocSkill[],
  record: Record<string, unknown>
): string {
  const lines: string[] = ['CCB<=50 【1D100ロール】'];

  const abilityLines = ABILITIES.filter((ability) => params.some((param) => param.label === ability.label)).map(
    (ability) => `CCB<={${ability.label}}*5 【${ability.label}】`
  );
  const derivedLines = DERIVED.filter((derived) => params.some((param) => param.label === derived.label)).map(
    (derived) => `CCB<={${derived.label}} 【${derived.label}】`
  );
  if (abilityLines.length > 0 || derivedLines.length > 0) lines.push('◆能力値', ...abilityLines, ...derivedLines);

  if (statuses.some((status) => status.label === '正気度')) lines.push('◆正気度', 'CCB<={正気度} 【正気度ロール】');

  const skillLines = skills.map((skill) => `CCB<={${skill.name}} 【${skill.name}】`);
  if (skillLines.length > 0) lines.push('◆技能', ...skillLines);

  const damageBonus = asString(record['dmg_bonus']).trim();
  if (damageBonus !== '' && damageBonus !== '0') lines.push('◆戦闘', `${damageBonus} 【ダメージボーナス】`);

  return lines.join('\n');
}

export function buildCoc6CharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isCoc6CharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Cthulhu';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  const statuses = buildStatuses(record);
  const params = buildParams(record);
  const skills = collectSkills(record);
  character.statuses = statuses;
  character.params = params;
  character.sections = [
    buildSkillSection(skills),
    buildParallelSection('武器', 'arms_name', WEAPON_COLUMNS, record),
    buildParallelSection('所持品', 'item_name', ITEM_COLUMNS, record),
    buildOtherSection(record),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(params, statuses, skills, record);

  return character;
}
