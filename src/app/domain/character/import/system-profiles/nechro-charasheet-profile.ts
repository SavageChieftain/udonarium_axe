import { normalizeImage } from '@axe/domain/character/import/charasheet-character-parser';
import {
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedSection,
  isNonEmptyScalar,
  normalizeHexColor,
  profileSectionOf,
  scalarField,
} from '@axe/domain/character/import/imported-character';
import { asArray, asString, isCharasheetGame } from '@axe/domain/character/import/system-profiles/charasheet-shared';

/**
 * 永い後日談のネクロニカ（保管所 game="nechro"）プロファイル。
 *
 * マニューバ = 並列配列 `Power_name` / `Power_shozoku`(分類) / `Power_Type`(部位コード) /
 * `Power_timing`(タイミングコード) / `Power_cost` / `Power_range` / `Power_memo`(効果)。
 * 部位・タイミングのコード→ラベルは作成ページ nechro_pc_making.html の <select> を権威として転記。
 */
const POWER_TYPE: Record<string, string> = {
  '1': 'ポジション',
  '2': 'メインクラス',
  '3': 'サブクラス',
  '4': '頭',
  '5': '腕',
  '6': '胴',
  '7': '足',
};

const POWER_TIMING: Record<string, string> = {
  '0': 'オート',
  '1': 'アクション',
  '2': 'ジャッジ',
  '3': 'ダメージ',
  '4': 'ラピッド',
};

const ROICE_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'damage', label: '損傷' },
  { suffix: 'neg', label: '負の感情' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'Position_Name', label: 'ポジション' },
  { key: 'MCLS_Name', label: 'メインクラス' },
  { key: 'SCLS_Name', label: 'サブクラス' },
];

export function isNechroCharasheetCharacter(parsed: unknown): boolean {
  return isCharasheetGame(parsed, 'nechro');
}

function mappedField(label: string, raw: unknown, map: Record<string, string>): ImportedField | null {
  if (!isNonEmptyScalar(raw)) return null;
  const key = asString(raw).trim();
  return { label, value: map[key] ?? key, kind: 'text' };
}

function buildManeuverSection(record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record['Power_name']);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields = [
      scalarField('分類', asArray(record['Power_shozoku'])[index]),
      mappedField('部位', asArray(record['Power_Type'])[index], POWER_TYPE),
      mappedField('タイミング', asArray(record['Power_timing'])[index], POWER_TIMING),
      scalarField('コスト', asArray(record['Power_cost'])[index]),
      scalarField('射程', asArray(record['Power_range'])[index]),
      scalarField('効果', asArray(record['Power_memo'])[index]),
    ].filter((field): field is ImportedField => field != null);
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: 'マニューバ', groups } : null;
}

function buildRoiceSection(record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record['roice_name']);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields = ROICE_COLUMNS.map((column) =>
      scalarField(column.label, asArray(record[`roice_${column.suffix}`])[index])
    ).filter((field): field is ImportedField => field != null);
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: '未練', groups } : null;
}

export function buildNechroCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isNechroCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Nechronica';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.sections = [
    buildManeuverSection(record),
    buildRoiceSection(record),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = ['2NC 【判定】', '2NA 【攻撃判定】'].join('\n');

  return character;
}
