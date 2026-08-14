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

// パラサイトブラッド（保管所 game="parabla"）の6能力値。順序は作成ページ <th> ヘッダで確認。
// S{i}=能力値, NB{i}=判定値（=能力値+2 を実データで確認、2d6 に加える修正値）。
const ABILITIES: { value: string; rate: string; label: string }[] = [
  { value: 'S1', rate: 'NB1', label: '肉体' },
  { value: 'S2', rate: 'NB2', label: '機敏' },
  { value: 'S3', rate: 'NB3', label: '感覚' },
  { value: 'S4', rate: 'NB4', label: '幸運' },
  { value: 'S5', rate: 'NB5', label: '知力' },
  { value: 'S6', rate: 'NB6', label: '精神' },
];

const POWER_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'shozoku', label: '系統' },
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'cost', label: 'コスト' },
  { suffix: 'taisho', label: '対象' },
  { suffix: 'range', label: '射程' },
  { suffix: 'memo', label: '効果' },
];

const WEAPON_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'hit', label: '命中' },
  { suffix: 'damage_dice', label: 'ダメージダイス' },
  { suffix: 'damage_base', label: 'ダメージ' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'race', label: '種族' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isParablaCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'parabla';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.value]))
      params.push({ label: ability.label, value: asString(record[ability.value]) });
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
  const lines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.rate])).map(
    (ability) => `2d6+${asString(record[ability.rate]).trim()} 【${ability.label}判定】`
  );
  return lines.join('\n');
}

export function buildParablaCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isParablaCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'ParasiteBlood';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [
    zipSection('異能', 'Power', POWER_COLUMNS, record),
    zipSection('武器', 'arms', WEAPON_COLUMNS, record),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
