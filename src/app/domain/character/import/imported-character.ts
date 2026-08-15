export type ImportSourceFormat = 'ccfolia' | 'charasheet' | 'appspot' | 'ytsheet' | 'udonarium' | 'unknown';

export interface ImportedStatus {
  label: string;
  value: number;
  max: number;
}

export interface ImportedParam {
  label: string;
  value: string;
}

export type ImportedFieldKind = 'text' | 'number' | 'note';

export interface ImportedField {
  label: string;
  value: string | number;
  kind: ImportedFieldKind;
}

export interface ImportedGroup {
  label: string;
  fields: ImportedField[];
}

/**
 * A general section that carries the system's own data with its structure intact.
 * A shape that depends on the system, as the warehouse has, is spread onto the sheet without losing a field.
 */
export interface ImportedSection {
  label: string;
  groups: ImportedGroup[];
}

/**
 * What the gapped skill table of those systems arrives as.
 * It holds the name and the learnt flag of each cell by category and row, and the factory
 * spreads it into a section shown as a table of checks.
 */
export interface ImportedSkillTable {
  name: string;
  categories: string[];
  skillsByCategory: string[][];
  checked?: boolean[][];
  gaps?: boolean[];
  rowNames?: string[];
}

export interface ImportedCharacter {
  name: string;
  size: number;
  statuses: ImportedStatus[];
  params: ImportedParam[];
  sections: ImportedSection[];
  skillTables: ImportedSkillTable[];
  memo: string;
  initiative: number | null;
  externalUrl: string;
  color: string;
  commands: string;
  dicebot: string;
  iconUrl: string;
  iconImageIdentifier: string;
  sourceFormat: ImportSourceFormat;
}

export function createEmptyImportedCharacter(sourceFormat: ImportSourceFormat): ImportedCharacter {
  return {
    name: '',
    size: 1,
    statuses: [],
    params: [],
    sections: [],
    skillTables: [],
    memo: '',
    initiative: null,
    externalUrl: '',
    color: '',
    commands: '',
    dicebot: '',
    iconUrl: '',
    iconImageIdentifier: '',
    sourceFormat,
  };
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Read as text. Numbers and words go into the same holder, so the reader takes text. */
export function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function isNonEmptyScalar(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '';
}

/** Only the fields that hold something become a field; an empty one on a piece helps nobody. */
export function scalarField(label: string, raw: unknown): ImportedField | null {
  if (!isNonEmptyScalar(raw)) return null;
  const classified = classifyScalar(raw);
  return { label, value: classified.value, kind: classified.kind };
}

/** Which heading on the sheet goes where. It is the only thing that differs between systems. */
export interface FieldLabel {
  key: string;
  label: string;
}

/**
 * The profile section, which comes out the same shape whatever the system.
 *
 * It gathers the fields that only need laying out, such as the race and the age.
 * Anything that should come first is passed as leading.
 */
export function profileSectionOf(
  record: Record<string, unknown> | null,
  fields: readonly FieldLabel[],
  leading: readonly ImportedField[] = []
): ImportedSection | null {
  if (!record) return null;
  const built = [...leading];
  for (const field of fields) {
    const one = scalarField(field.label, record[field.key]);
    if (one) built.push(one);
  }
  return built.length > 0 ? { label: 'プロフィール', groups: [{ label: '基本', fields: built }] } : null;
}

export function classifyScalar(raw: string | number): { value: string | number; kind: ImportedFieldKind } {
  if (typeof raw === 'number') return { value: raw, kind: Number.isFinite(raw) ? 'number' : 'text' };
  if (raw.includes('\n') || raw.length > 40) return { value: raw, kind: 'note' };
  if (raw.trim() !== '' && Number.isFinite(Number(raw))) return { value: Number(raw), kind: 'number' };
  return { value: raw, kind: 'text' };
}

export function normalizeHexColor(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed) ? trimmed : '';
}
