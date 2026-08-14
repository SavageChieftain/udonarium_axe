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
import { asArray, asString } from '@axe/domain/character/import/system-profiles/charasheet-shared';

const ABILITIES: { key: string; label: string }[] = [
  { key: 'S1', label: '肉体' },
  { key: 'S2', label: '感覚' },
  { key: 'S3', label: '精神' },
  { key: 'S4', label: '社会' },
];

// 保管所 DX3（game="dx3"）の skill_* は固定12技能の並列配列。順序は能力値ごとに3技能（肉体→感覚→精神→社会）。
// 知識/情報 等の分野は skill_memo[i] に入る（位置8=知識:オカルト, 位置11=情報:UGN を実データで確認）。
const SKILLS: string[] = ['白兵', '回避', '運転', '射撃', '知覚', '芸術', 'RC', '意志', '知識', '交渉', '調達', '情報'];

const EFFECT_COLUMNS: { suffix: string; label: string }[] = [
  { suffix: 'lv', label: 'レベル' },
  { suffix: 'timing', label: 'タイミング' },
  { suffix: 'hantei', label: '判定' },
  { suffix: 'taisho', label: '対象' },
  { suffix: 'range', label: '射程' },
  { suffix: 'cost', label: '侵蝕値' },
  { suffix: 'shozoku', label: 'シンドローム' },
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'works', label: 'ワークス' },
  { key: 'cover', label: 'カヴァー' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isDx3CharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'dx3';
}

function skillDisplayName(index: number, record: Record<string, unknown>): string {
  const base = SKILLS[index];
  const field = asString(asArray(record['skill_memo'])[index]).trim();
  return field === '' ? base : `${base}:${field}`;
}

function skillRoll(index: number, record: Record<string, unknown>): string {
  // skill_total は "5r+6" 形式（DX 振り＋達成値修正）。bcdice DoubleCross の "5DX+6" に変換する。
  const total = asString(asArray(record['skill_total'])[index]).trim();
  if (total === '' || !/\dr/i.test(total)) return '';
  return total.replace(/r/gi, 'DX');
}

function buildParams(record: Record<string, unknown>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const ability of ABILITIES) {
    if (isNonEmptyScalar(record[ability.key]))
      params.push({ label: ability.label, value: asString(record[ability.key]) });
  }
  return params;
}

function buildSkillSection(record: Record<string, unknown>): ImportedSection | null {
  const groups: ImportedGroup[] = [];
  SKILLS.forEach((_, index) => {
    const roll = skillRoll(index, record);
    if (roll === '') return;
    const fields: ImportedField[] = [{ label: '技能値', value: roll, kind: 'text' }];
    const level = asArray(record['skill_tokugi'])[index];
    if (isNonEmptyScalar(level)) {
      const classified = classifyScalar(level);
      fields.push({ label: 'レベル', value: classified.value, kind: classified.kind });
    }
    groups.push({ label: skillDisplayName(index, record), fields });
  });
  return groups.length > 0 ? { label: '技能', groups } : null;
}

function buildEffectSection(label: string, prefix: string, record: Record<string, unknown>): ImportedSection | null {
  const names = asArray(record[`${prefix}_name`]);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    for (const column of EFFECT_COLUMNS) {
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
  const lines: string[] = ['1DX 【判定】'];
  const skillLines: string[] = [];
  SKILLS.forEach((_, index) => {
    const roll = skillRoll(index, record);
    if (roll === '') return;
    skillLines.push(`${roll} 【${skillDisplayName(index, record)}】`);
  });
  if (skillLines.length > 0) lines.push('◆技能', ...skillLines);
  return lines.join('\n');
}

export function buildDx3CharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isDx3CharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = 'DoubleCross';
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  character.params = buildParams(record);
  character.sections = [
    buildSkillSection(record),
    buildEffectSection('エフェクト', 'effect', record),
    buildEffectSection('コンボ', 'easyeffect', record),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
