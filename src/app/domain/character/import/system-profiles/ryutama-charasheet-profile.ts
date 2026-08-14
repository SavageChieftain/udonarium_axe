import { normalizeImage } from '@axe/domain/character/import/charasheet-character-parser';
import {
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedParam,
  ImportedSection,
  isNonEmptyScalar,
  normalizeHexColor,
  profileSectionOf,
} from '@axe/domain/character/import/imported-character';
import {
  asString,
  buildPrefixedSection,
  isCharasheetGame,
} from '@axe/domain/character/import/system-profiles/charasheet-shared';

// りゅうたま（保管所 game="ryutama"）の4能力値。S{i}=サイコロの面数（d4/d6/…）。順序は作成ページの <th> ヘッダで確認。
const ABILITIES: { key: string; label: string }[] = [
  { key: 'S1', label: '体力' },
  { key: 'S2', label: '敏捷' },
  { key: 'S3', label: '知力' },
  { key: 'S4', label: '精神' },
];

const CLASS_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'hantei', label: '判定' },
  { suffix: 'taishou', label: '対象' },
  { suffix: 'kouka', label: '効果' },
];

const SPELL_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'mp', label: 'MP' },
  { suffix: 'time', label: 'タイミング' },
  { suffix: 'taisho', label: '対象' },
  { suffix: 'range', label: '射程' },
  { suffix: 'memo', label: '効果' },
];

const ITEM_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'life', label: '耐久' },
  { suffix: 'weight', label: '重量' },
  { suffix: 'price', label: '価格' },
  { suffix: 'memo', label: '効果' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'class_name', label: 'クラス' },
  { key: 'shuzoku_name', label: '種族' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isRyutamaCharasheetCharacter(parsed: unknown): boolean {
  return isCharasheetGame(parsed, 'ryutama');
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: `d${asString(record[ability.key]).trim()}` });
  }
  return params;
}

function buildPalette(record: Record<string, unknown>): string {
  const lines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.key])).map(
    (ability) => `1d${asString(record[ability.key]).trim()} 【${ability.label}】`
  );
  return lines.join('\n');
}

export function buildRyutamaCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isRyutamaCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'Ryutama';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [
    buildPrefixedSection('クラス能力', 'cls', CLASS_COLUMNS, record),
    buildPrefixedSection('呪文', 'spell', SPELL_COLUMNS, record),
    buildPrefixedSection('所持品', 'item', ITEM_COLUMNS, record),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
