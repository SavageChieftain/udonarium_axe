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
