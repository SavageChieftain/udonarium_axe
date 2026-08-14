import {
  asString,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedParam,
  ImportedSection,
  ImportedStatus,
  isNonEmptyScalar,
  normalizeHexColor,
  profileSectionOf,
  toFiniteNumber,
} from '@axe/domain/character/import/imported-character';
import {
  asArray,
  buildPrefixedSection,
  normalizeImage,
  paramsOf,
} from '@axe/domain/character/import/system-profiles/charasheet-shared';

export interface SwordWorldCharasheetConfig {
  game: string;
  dicebot: string;
  skillLabel: string;
  skillPrefix: string;
  skillColumns: { suffix: string; label: string }[];
}

// ソードワールド系（保管所）の能力ボーナス。NB{i} = 各能力値ボーナス（判定に使用）。順序は標準で全版共通。
const ABILITY_BONUSES: { key: string; label: string }[] = [
  { key: 'NB1', label: '器用B' },
  { key: 'NB2', label: '敏捷B' },
  { key: 'NB3', label: '筋力B' },
  { key: 'NB4', label: '生命力B' },
  { key: 'NB5', label: '知力B' },
  { key: 'NB6', label: '精神B' },
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
    if (power === '' || !Number.isFinite(Number(power))) return;
    const crit = toFiniteNumber(asArray(record['arms_critical'])[index], Number.NaN);
    const damage = toFiniteNumber(asArray(record['arms_damage'])[index], 0);
    const critPart = Number.isFinite(crit) && crit >= 7 && crit <= 13 ? `@${crit}` : '';
    weaponLines.push(`K${power}${critPart}${damage ? `+${damage}` : ''} 【${name} 打撃】`);
  });
  if (weaponLines.length > 0) lines.push('◆武器', ...weaponLines);

  return lines.join('\n');
}

export function buildSwordWorldCharasheet(
  parsed: unknown,
  config: SwordWorldCharasheetConfig
): ImportedCharacter | null {
  if (parsed == null || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  if (typeof record['pc_name'] !== 'string' || asString(record['game']).trim().toLowerCase() !== config.game)
    return null;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = config.dicebot;
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  const params = paramsOf(record, ABILITY_BONUSES);
  character.params = params;
  character.statuses = buildStatuses(record);
  character.sections = [
    buildPrefixedSection(config.skillLabel, config.skillPrefix, config.skillColumns, record),
    buildPrefixedSection('武器', 'arms', WEAPON_COLUMNS, record),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record, params);

  return character;
}
