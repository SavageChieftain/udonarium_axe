import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedSection,
  ImportedSkillTable,
} from '@axe/domain/character/import/imported-character';

export interface FieldLabel {
  key: string;
  label: string;
}

/**
 * サイコ・フィクション系（冒険企画局: シノビガミ / インセイン / マギカロギア …、倉庫 appspot）共通の取り込みビルダー。
 * いずれも特技表＝分野×段階の GAP グリッド（skills.row{r}.check{c} ＋ ギャップ a..f ＋ learned[].id）と、
 * 指定特技つきの異能配列（忍法 / アビリティ …）を持つ。差分は SystemConfig で吸収する。
 */
export interface PsychoFictionConfig {
  dicebot: string;
  categories: string[];
  skillsByCategory: string[][];
  abilityKey: string;
  abilitySectionLabel: string;
  abilityFields: FieldLabel[];
  profileFields: FieldLabel[];
  /** 異能配列の「指定特技」を持つキー（既定 'targetSkill'。マギカロギア/カードランカーは 'skill' 等）。 */
  targetSkillKey?: string;
}

const BACKGROUND_FIELDS: FieldLabel[] = [
  { key: 'type', label: '種別' },
  { key: 'point', label: '功績' },
  { key: 'effect', label: '効果' },
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

function isChecked(value: unknown): boolean {
  const text = asString(value).trim();
  return text !== '' && text !== '0';
}

function resolveRoot(record: Record<string, unknown>, abilityKey: string): Record<string, unknown> {
  if (asRecord(record['base']) != null || Array.isArray(record[abilityKey])) return record;
  return asRecord(record['data']) ?? record;
}

export function isPsychoFictionAppspotCharacter(parsed: unknown, abilityKey: string): boolean {
  const record = asRecord(parsed);
  if (!record) return false;
  const root = resolveRoot(record, abilityKey);
  const base = asRecord(root['base']);
  return (base != null && typeof base['name'] === 'string') || Array.isArray(root[abilityKey]);
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

function buildProfileSection(
  base: Record<string, unknown> | null,
  profileFields: FieldLabel[]
): ImportedSection | null {
  if (!base) return null;
  const fields: ImportedField[] = [];
  for (const field of profileFields) {
    const raw = base[field.key];
    if (!isNonEmptyScalar(raw)) continue;
    const classified = classifyScalar(raw);
    fields.push({ label: field.label, value: classified.value, kind: classified.kind });
  }
  return fields.length > 0 ? { label: 'プロフィール', groups: [{ label: '基本', fields }] } : null;
}

function buildSkillTable(root: Record<string, unknown>, config: PsychoFictionConfig): ImportedSkillTable {
  const rows = config.skillsByCategory[0]?.length ?? 11;
  const checked = config.categories.map(() => new Array<boolean>(rows).fill(false));

  for (const element of asArray(root['learned'])) {
    const record = asRecord(element);
    const match = /skills\.row(\d+)\.name(\d+)/.exec(asString(record?.['id']));
    if (!match) continue;
    const row = Number(match[1]);
    const column = Number(match[2]);
    if (checked[column]?.[row] !== undefined) checked[column][row] = true;
  }

  const skills = asRecord(root['skills']) ?? {};
  const gaps = ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => isChecked(skills[key]));

  return {
    name: '特技表',
    categories: config.categories,
    skillsByCategory: config.skillsByCategory,
    checked,
    gaps,
  };
}

function buildPalette(abilities: unknown, targetSkillKey: string): string {
  const lines: string[] = ['2D6>=5 【判定】'];
  for (const element of asArray(abilities)) {
    const record = asRecord(element);
    if (!record) continue;
    const name = asString(record['name']).trim();
    if (name === '') continue;
    const targetSkill = asString(record[targetSkillKey]).trim();
    lines.push(`2D6>=5 【${name}${targetSkill === '' ? '' : `／${targetSkill}`}】`);
  }
  return lines.join('\n');
}

export function buildPsychoFictionCharacter(parsed: unknown, config: PsychoFictionConfig): ImportedCharacter | null {
  if (!isPsychoFictionAppspotCharacter(parsed, config.abilityKey)) return null;
  const root = resolveRoot(asRecord(parsed)!, config.abilityKey);
  const base = asRecord(root['base']);

  const character = createEmptyImportedCharacter('appspot');
  character.name = asString(base?.['name'] ?? root['name']).trim();
  character.memo = asString(base?.['memo']);
  character.dicebot = config.dicebot;

  character.sections = [
    labeledSection(config.abilitySectionLabel, root[config.abilityKey], config.abilityFields),
    labeledSection('背景', root['background'], BACKGROUND_FIELDS),
    buildProfileSection(base, config.profileFields),
  ].filter((section): section is ImportedSection => section != null);

  const outline = asString(root['outline']).trim();
  if (outline !== '') {
    character.sections.push({
      label: '設定',
      groups: [{ label: '基本', fields: [{ label: '設定', value: outline, kind: 'note' }] }],
    });
  }

  character.skillTables = [buildSkillTable(root, config)];
  character.commands = buildPalette(root[config.abilityKey], config.targetSkillKey ?? 'targetSkill');

  return character;
}
