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

// ウタカゼ（保管所 game="utakaze"）の4能力値。キーが名前付き（N_Yuuki=勇気 等）なので位置推測は不要。
const ABILITIES: { key: string; label: string }[] = [
  { key: 'N_Yuuki', label: '勇気' },
  { key: 'N_Chie', label: '知恵' },
  { key: 'N_Aijou', label: '愛情' },
  { key: 'N_Kibou', label: '希望' },
];

const SKILL_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'sl', label: 'レベル' },
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'cost', label: 'コスト' },
  { suffix: 'power', label: '威力' },
  { suffix: 'memo', label: '効果' },
];

const FRIEND_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'lv', label: '絆' },
  { suffix: 'memo', label: 'メモ' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'race', label: '種族' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isUtakazeCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'utakaze';
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
    (ability) => `${asString(record[ability.key]).trim()}UK 【${ability.label}】`
  );
  return lines.join('\n');
}

export function buildUtakazeCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isUtakazeCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Utakaze';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [
    zipSection('特技', 'skill', SKILL_COLUMNS, record),
    zipSection('仲間', 'friend', FRIEND_COLUMNS, record),
    zipSection('所持品', 'item', [{ suffix: 'memo', label: 'メモ' }], record),
    buildProfileSection(record),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
