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

// 千幻抄（保管所 game="sengen"）の5能力値。NP{i}=能力値（特性値+修正の合計）。順序は作成ページ <th> ヘッダで確認。
const ABILITIES: { key: string; label: string }[] = [
  { key: 'NP1', label: '身体' },
  { key: 'NP2', label: '耐久' },
  { key: 'NP3', label: '知性' },
  { key: 'NP4', label: '感覚' },
  { key: 'NP5', label: '意志' },
];

// 妖術・魔法の系統コード（effect_shozoku）→ ラベル。作成ページ <select> を権威として転記。
const SPELL_CATEGORY: Record<string, string> = {
  '1': '神術/陰陽',
  '2': '魔法',
  '3': '属性/基本',
  '4': '属性/応用',
  '5': '妖術',
  '6': '妖術+妖弾',
  '7': '妖術+常在',
};

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'shuzoku', label: '種族' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isSengenCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'sengen';
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
  }
  return params;
}

function buildSpellSection(record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record['effect_name']);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    const category = asString(asArray(record['effect_shozoku'])[index]).trim();
    if (SPELL_CATEGORY[category] != null) fields.push({ label: '系統', value: SPELL_CATEGORY[category], kind: 'text' });
    for (const [suffix, label] of [
      ['lv', 'レベル'],
      ['memo', '効果'],
    ] as const) {
      const cell = asArray(record[`effect_${suffix}`])[index];
      if (!isNonEmptyScalar(cell)) continue;
      const classified = classifyScalar(cell);
      fields.push({ label, value: classified.value, kind: classified.kind });
    }
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: '妖術・魔法', groups } : null;
}

function buildPalette(record: Record<string, unknown>): string {
  const lines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.key])).map(
    (ability) => `SGS+${asString(record[ability.key]).trim()} 【${ability.label}判定】`
  );
  return lines.join('\n');
}

export function buildSengenCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isSengenCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Sengensyou';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [buildSpellSection(record), profileSectionOf(record, PROFILE_FIELDS)].filter(
    (section): section is ImportedSection => section != null
  );

  character.commands = buildPalette(record);

  return character;
}
