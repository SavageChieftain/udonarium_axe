import {
  classifyScalar,
  FieldLabel,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  isNonEmptyScalar,
} from '@axe/domain/character/import/imported-character';

export interface Column {
  key: string;
  label: string;
}

export function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/**
 * 保管庫のシートが、そのシステムのものか。
 *
 * どのシートも `pc_name` を持ち、`game` にシステムの符丁が入る。見るのはそこだけ。
 */
export function isCharasheetGame(parsed: unknown, game: string): boolean {
  return charasheetGameOf(parsed) === game;
}

/** シートが名乗っているシステムの符丁。保管庫のシートでなければ空。 */
export function charasheetGameOf(parsed: unknown): string {
  if (parsed == null || typeof parsed !== 'object') return '';
  const record = parsed as Record<string, unknown>;
  if (typeof record['pc_name'] !== 'string') return '';
  return asString(record['game']).trim().toLowerCase();
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * そのまま並べる能力値。値の入っていない欄は出さない。
 *
 * 何をどの名前で並べるかはシステムごとに違うが、並べ方は変わらない。
 */
export function paramsOf(record: Record<string, unknown>, fields: readonly FieldLabel[]): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const field of fields) {
    if (isNonEmptyScalar(record[field.key])) params.push({ label: field.label, value: asString(record[field.key]) });
  }
  return params;
}

export function buildParallelSection(
  label: string,
  nameKey: string,
  columns: Column[],
  record: Record<string, unknown>
): ImportedSection | null {
  const names = asArray(record[nameKey]);
  const groups: ImportedGroup[] = [];
  names.forEach((rawName, index) => {
    const name = asString(rawName).trim();
    if (name === '') return;
    const fields: ImportedField[] = [];
    for (const column of columns) {
      const cell = asArray(record[column.key])[index];
      if (!isNonEmptyScalar(cell)) continue;
      const classified = classifyScalar(cell);
      fields.push({ label: column.label, value: classified.value, kind: classified.kind });
    }
    groups.push({ label: name, fields });
  });
  return groups.length > 0 ? { label, groups } : null;
}

/**
 * `{prefix}_name` と `{prefix}_{suffix}` の並びを 1 行ずつ組にする。
 *
 * 保管庫のシートは 1 つの表を「名前の配列」「威力の配列」…と列ごとに持つ。
 * 同じ添字どうしが 1 行ぶんになる。
 */
export function buildPrefixedSection(
  label: string,
  prefix: string,
  columns: { suffix: string; label: string }[],
  record: Record<string, unknown>
): ImportedSection | null {
  return buildParallelSection(
    label,
    `${prefix}_name`,
    columns.map((column) => ({ key: `${prefix}_${column.suffix}`, label: column.label })),
    record
  );
}

export function buildOtherSection(
  record: Record<string, unknown>,
  isStructuredKey: (key: string) => boolean
): ImportedSection | null {
  const fields: ImportedField[] = [];
  for (const [key, raw] of Object.entries(record)) {
    if (isStructuredKey(key) || Array.isArray(raw) || !isNonEmptyScalar(raw)) continue;
    const classified = classifyScalar(raw);
    fields.push({ label: key, value: classified.value, kind: classified.kind });
  }
  return fields.length > 0 ? { label: 'その他', groups: [{ label: '基本', fields }] } : null;
}
