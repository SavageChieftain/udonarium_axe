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

// エリュシオン（保管所 game="elysion"）の3主能力。NB1-3。順序・スキルの能力コードは作成ページの <th>/<select> で確認。
const ABILITIES: { key: string; label: string }[] = [
  { key: 'NB1', label: '学力' },
  { key: 'NB2', label: '青春力' },
  { key: 'NB3', label: '政治力' },
];

// スキルの判定能力コード（Power_hantei）→ ラベル。0=指定なし。作成ページ <select> を権威として転記。
const SKILL_ABILITY: Record<string, string> = {
  '1': '学力',
  '2': '青春力',
  '3': '政治力',
  '4': '力',
  '5': '力',
};

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'shuzoku_name', label: '種族' },
  { key: 'class_name', label: 'クラス' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isElysionCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'elysion';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
  }
  return params;
}

function mappedField(label: string, raw: unknown, map: Record<string, string>): ImportedField | null {
  if (!isNonEmptyScalar(raw)) return null;
  const key = asString(raw).trim();
  const value = map[key];
  return value == null ? null : { label, value, kind: 'text' };
}

function plainField(label: string, raw: unknown): ImportedField | null {
  if (!isNonEmptyScalar(raw)) return null;
  const classified = classifyScalar(raw);
  return { label, value: classified.value, kind: classified.kind };
}

function buildSkillSection(record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record['Power_name']);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields = [
      plainField('レベル', asArray(record['Power_Level'])[index]),
      mappedField('能力', asArray(record['Power_hantei'])[index], SKILL_ABILITY),
      plainField('タイミング', asArray(record['Power_timing'])[index]),
      plainField('射程', asArray(record['Power_range'])[index]),
      plainField('コスト', asArray(record['Power_cost'])[index]),
      plainField('制限', asArray(record['Power_limit'])[index]),
    ].filter((field): field is ImportedField => field != null);
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: 'スキル', groups } : null;
}

function buildProfileSection(record: Record<string, unknown>): ImportedSection | null {
  const fields: ImportedField[] = [];
  for (const field of PROFILE_FIELDS) {
    const built = plainField(field.label, record[field.key]);
    if (built != null) fields.push(built);
  }
  return fields.length > 0 ? { label: 'プロフィール', groups: [{ label: '基本', fields }] } : null;
}

function buildPalette(record: Record<string, unknown>): string {
  const lines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.key])).map(
    (ability) => `EL${asString(record[ability.key]).trim()} 【${ability.label}判定】`
  );
  return lines.join('\n');
}

export function buildElysionCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isElysionCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Elysion';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [buildSkillSection(record), buildProfileSection(record)].filter(
    (section): section is ImportedSection => section != null
  );

  character.commands = buildPalette(record);

  return character;
}
