import {
  classifyScalar,
  ImportedField,
  ImportedGroup,
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

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
