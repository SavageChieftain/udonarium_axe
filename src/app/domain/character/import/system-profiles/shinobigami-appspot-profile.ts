import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedSection,
} from '@axe/domain/character/import/imported-character';

interface FieldLabel {
  key: string;
  label: string;
}

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
