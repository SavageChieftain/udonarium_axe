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

export const WEAPON_COLUMNS: Column[] = [
  { key: 'arms_hit', label: '成功率' },
  { key: 'arms_damage', label: 'ダメージ' },
  { key: 'arms_range', label: '射程' },
  { key: 'arms_attack_count', label: '攻撃回数' },
  { key: 'arms_last_shot', label: '装弾数' },
  { key: 'arms_vitality', label: '耐久力' },
  { key: 'arms_sonota', label: 'その他' },
];

export const ITEM_COLUMNS: Column[] = [
  { key: 'item_tanka', label: '単価' },
  { key: 'item_num', label: '個数' },
  { key: 'item_price', label: '価格' },
  { key: 'item_memo', label: 'メモ' },
];

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
