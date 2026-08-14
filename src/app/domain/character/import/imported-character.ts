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
 * システム固有データ（技能・コンボ・武器など）を構造を保ったまま運ぶための汎用セクション。
 * キャラクターシート倉庫のような system 依存スキーマを、項目を落とさず detail ツリーへ展開する。
 */
export interface ImportedSection {
  label: string;
  groups: ImportedGroup[];
}

/**
 * サイコフィクション系の「ギャップ付き特技表」を運ぶための入力。
 * [カテゴリ][行] でセル名・習得フラグを持ち、factory が createSkillGapTableElement で
 * テーブル表示の CHECK_TABLE セクションへ展開する。
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

/** 文字にして扱う。数でも文字でも同じ入れ物に入るので、読む側は文字で受ける。 */
export function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function isNonEmptyScalar(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '';
}

/** 値のある項目だけを 1 つの欄にする。空欄はコマに並べても読み手の役に立たない。 */
export function scalarField(label: string, raw: unknown): ImportedField | null {
  if (!isNonEmptyScalar(raw)) return null;
  const classified = classifyScalar(raw);
  return { label, value: classified.value, kind: classified.kind };
}

/** シートの見出しと取り出し先の対応。システムごとに違うのはこの並びだけ。 */
export interface FieldLabel {
  key: string;
  label: string;
}

/**
 * どのシステムでも同じ形になる「プロフィール」の節。
 *
 * 種族や年齢のような、値をそのまま並べるだけの欄をまとめる。
 * 先に出したい欄があるときは `leading` に渡す。
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
