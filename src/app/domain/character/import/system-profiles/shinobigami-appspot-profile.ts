import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedSection,
  ImportedSkillTable,
} from '@axe/domain/character/import/imported-character';

interface FieldLabel {
  key: string;
  label: string;
}

// シノビガミ基本ルールブックの特技表（6分野×11行＝2〜12）。bcdice ShinobiGami の SaiFicSkillTable と同一。
// appspot の skills.row{r}.check{c} / learned[].id="skills.row{r}.name{c}" の (列c, 行r) と一致する。
const SHINOBIGAMI_CATEGORIES = ['器術', '体術', '忍術', '謀術', '戦術', '妖術'];

const SHINOBIGAMI_SKILLS: string[][] = [
  ['絡繰術', '火術', '水術', '針術', '仕込み', '衣装術', '縄術', '登術', '拷問術', '壊器術', '掘削術'],
  ['騎乗術', '砲術', '手裏剣術', '手練', '身体操術', '歩法', '走法', '飛術', '骨法術', '刀術', '怪力'],
  ['生存術', '潜伏術', '遁走術', '盗聴術', '腹話術', '隠形術', '変装術', '香術', '分身の術', '隠蔽術', '第六感'],
  ['医術', '毒術', '罠術', '調査術', '詐術', '対人術', '遊芸', '九ノ一の術', '傀儡の術', '流言の術', '経済力'],
  ['兵糧術', '鳥獣術', '野戦術', '地の利', '意気', '用兵術', '記憶術', '見敵術', '暗号術', '伝達術', '人脈'],
  ['異形化', '召喚術', '死霊術', '結界術', '封術', '言霊術', '幻術', '瞳術', '千里眼の術', '憑依術', '呪術'],
];

const GAP_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

const NINPOU_FIELDS: FieldLabel[] = [
  { key: 'type', label: '種別' },
  { key: 'targetSkill', label: '指定特技' },
  { key: 'range', label: '間合' },
  { key: 'cost', label: 'コスト' },
  { key: 'effect', label: '効果' },
  { key: 'page', label: 'ページ' },
];

const BACKGROUND_FIELDS: FieldLabel[] = [
  { key: 'type', label: '種別' },
  { key: 'point', label: '功績' },
  { key: 'effect', label: '効果' },
];

const PROFILE_FIELDS: FieldLabel[] = [
  { key: 'nameKana', label: 'ふりがな' },
  { key: 'cover', label: '表の顔' },
  { key: 'level', label: '階級' },
  { key: 'exp', label: '功績点' },
  { key: 'age', label: '年齢' },
  { key: 'sex', label: '性別' },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isNonEmptyScalar(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '';
}

function resolveRoot(record: Record<string, unknown>): Record<string, unknown> {
  if (asRecord(record['base']) != null || Array.isArray(record['ninpou'])) return record;
  return asRecord(record['data']) ?? record;
}

export function isShinobigamiAppspotCharacter(parsed: unknown): boolean {
  const record = asRecord(parsed);
  if (!record) return false;
  const root = resolveRoot(record);
  const base = asRecord(root['base']);
  return (base != null && typeof base['name'] === 'string') || Array.isArray(root['ninpou']);
}

function labeledSection(label: string, array: unknown, fieldLabels: FieldLabel[]): ImportedSection | null {
  const groups: ImportedGroup[] = [];
  asArray(array).forEach((element, index) => {
    const record = asRecord(element);
    if (!record) return;
    const name = asString(record['name']).trim();
    const fields: ImportedField[] = [];
    for (const field of fieldLabels) {
      const raw = record[field.key];
      if (!isNonEmptyScalar(raw)) continue;
      const classified = classifyScalar(raw);
      fields.push({ label: field.label, value: classified.value, kind: classified.kind });
    }
    if (name === '' && fields.length === 0) return;
    groups.push({ label: name === '' ? `${label} ${index + 1}` : name, fields });
  });
  return groups.length > 0 ? { label, groups } : null;
}

function buildProfileSection(base: Record<string, unknown> | null): ImportedSection | null {
  if (!base) return null;
  const fields: ImportedField[] = [];
  for (const field of PROFILE_FIELDS) {
    const raw = base[field.key];
    if (!isNonEmptyScalar(raw)) continue;
    const classified = classifyScalar(raw);
    fields.push({ label: field.label, value: classified.value, kind: classified.kind });
  }
  return fields.length > 0 ? { label: 'プロフィール', groups: [{ label: '基本', fields }] } : null;
}

function isChecked(value: unknown): boolean {
  const text = asString(value).trim();
  return text !== '' && text !== '0';
}

function buildSkillTable(root: Record<string, unknown>): ImportedSkillTable {
  const checked = SHINOBIGAMI_CATEGORIES.map(() => new Array<boolean>(SHINOBIGAMI_SKILLS[0].length).fill(false));

  for (const element of asArray(root['learned'])) {
    const record = asRecord(element);
    const match = /skills\.row(\d+)\.name(\d+)/.exec(asString(record?.['id']));
    if (!match) continue;
    const row = Number(match[1]);
    const column = Number(match[2]);
    if (checked[column]?.[row] !== undefined) checked[column][row] = true;
  }

  const skills = asRecord(root['skills']) ?? {};
  const gaps = GAP_KEYS.map((key) => isChecked(skills[key]));

  return {
    name: '特技表',
    categories: SHINOBIGAMI_CATEGORIES,
    skillsByCategory: SHINOBIGAMI_SKILLS,
    checked,
    gaps,
  };
}

function buildPalette(ninpou: unknown): string {
  const lines: string[] = ['2D6>=5 【判定】'];
  for (const element of asArray(ninpou)) {
    const record = asRecord(element);
    if (!record) continue;
    const name = asString(record['name']).trim();
    if (name === '') continue;
    const targetSkill = asString(record['targetSkill']).trim();
    lines.push(`2D6>=5 【${name}${targetSkill === '' ? '' : `／${targetSkill}`}】`);
  }
  return lines.join('\n');
}

export function buildShinobigamiAppspotCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isShinobigamiAppspotCharacter(parsed)) return null;
  const root = resolveRoot(asRecord(parsed)!);
  const base = asRecord(root['base']);

  const character = createEmptyImportedCharacter('appspot');
  character.name = asString(base?.['name'] ?? root['name']).trim();
  character.memo = asString(base?.['memo']);
  character.dicebot = 'ShinobiGami';

  character.sections = [
    labeledSection('忍法', root['ninpou'], NINPOU_FIELDS),
    labeledSection('背景', root['background'], BACKGROUND_FIELDS),
    buildProfileSection(base),
  ].filter((section): section is ImportedSection => section != null);

  character.skillTables = [buildSkillTable(root)];

  const outline = asString(root['outline']).trim();
  if (outline !== '') {
    character.sections.push({
      label: '設定',
      groups: [{ label: '基本', fields: [{ label: '設定', value: outline, kind: 'note' }] }],
    });
  }

  character.commands = buildPalette(root['ninpou']);

  return character;
}
