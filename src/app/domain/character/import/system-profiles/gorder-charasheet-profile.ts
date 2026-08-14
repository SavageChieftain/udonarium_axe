import {
  asString,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedSection,
  isNonEmptyScalar,
  profileSectionOf,
} from '@axe/domain/character/import/imported-character';
import {
  asArray,
  buildPrefixedSection,
  charasheetCharacterOf,
  isCharasheetGame,
  paramsOf,
} from '@axe/domain/character/import/system-profiles/charasheet-shared';

// ガーデンオーダー（保管所 game="gorder"）は d100 ロールアンダー。能力値・固定技能の名称は
// 作成ページ gorder_pc_making.html の <th> ヘッダを権威として転記。判定値はパーセント（成功率）。
const ABILITIES: { value: string; rate: string; label: string }[] = [
  { value: 'NK1', rate: 'NB1', label: '身体' },
  { value: 'NK2', rate: 'NB2', label: '感覚' },
  { value: 'NK3', rate: 'NB3', label: '知力' },
  { value: 'NK4', rate: 'NB4', label: '意志' },
  { value: 'NK5', rate: 'NB5', label: '魅力' },
];

// 固定技能（TBA* 並列配列の行順）。TBAP=合計成功率, TBAC=C値（=成功率/5、GO が自動算出）。
const SKILLS: string[] = [
  '当て身',
  '近接武器',
  '銃器',
  '飛び道具',
  '回避',
  '威圧',
  '運転',
  '運動',
  '応急手当',
  '隠密',
  '解錠',
  '観察',
  '機械修理',
  '交渉',
  'コンピューター',
  '捜索',
  '調査',
  '追跡／逃走',
  '抵抗力',
  '特殊機械操作',
];

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'main_class', label: 'クラス' },
  { key: 'keireki_name', label: '経歴' },
  { key: 'shutuji_name', label: '出自' },
  { key: 'arm_type', label: '武装タイプ' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

export function isGorderCharasheetCharacter(parsed: unknown): boolean {
  return isCharasheetGame(parsed, 'gorder');
}

function buildSkillSection(record: Record<string, unknown>): ImportedSection | null {
  const totals = asArray(record['TBAP']);
  const crits = asArray(record['TBAC']);
  const groups: ImportedGroup[] = [];
  SKILLS.forEach((name, index) => {
    const rate = asString(totals[index]).trim();
    if (rate === '' || Number(rate) <= 0) return;
    const fields: ImportedField[] = [{ label: '成功率', value: Number(rate), kind: 'number' }];
    const crit = crits[index];
    if (isNonEmptyScalar(crit)) fields.push({ label: 'C値', value: Number(asString(crit)), kind: 'number' });
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label: '技能', groups } : null;
}

function buildPalette(record: Record<string, unknown>): string {
  const lines: string[] = [];

  const abilityLines = ABILITIES.filter((ability) => isNonEmptyScalar(record[ability.rate])).map(
    (ability) => `GO${asString(record[ability.rate]).trim()} 【${ability.label}】`
  );
  if (abilityLines.length > 0) lines.push('◆能力値', ...abilityLines);

  const totals = asArray(record['TBAP']);
  const skillLines: string[] = [];
  SKILLS.forEach((name, index) => {
    const rate = asString(totals[index]).trim();
    if (rate === '' || Number(rate) <= 0) return;
    skillLines.push(`GO${rate} 【${name}】`);
  });
  if (skillLines.length > 0) lines.push('◆技能', ...skillLines);

  return lines.join('\n');
}

export function buildGorderCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isGorderCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;

  const character = charasheetCharacterOf(record, 'GardenOrder');

  character.params = paramsOf(
    record,
    ABILITIES.map((ability) => ({ key: ability.value, label: ability.label }))
  );
  character.sections = [
    buildSkillSection(record),
    buildPrefixedSection(
      '特技',
      'ability',
      [
        { suffix: 'cost', label: 'コスト' },
        { suffix: 'memo', label: '効果' },
      ],
      record
    ),
    buildPrefixedSection(
      'インプラント',
      'implant',
      [
        { suffix: 'dest', label: '部位' },
        { suffix: 'cost', label: 'コスト' },
        { suffix: 'memo', label: '効果' },
      ],
      record
    ),
    profileSectionOf(record, PROFILE_FIELDS),
  ].filter((section): section is ImportedSection => section != null);

  character.commands = buildPalette(record);

  return character;
}
