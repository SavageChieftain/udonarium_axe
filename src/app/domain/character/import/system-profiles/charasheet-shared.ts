import {
  asString,
  classifyScalar,
  createEmptyImportedCharacter,
  FieldLabel,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  isNonEmptyScalar,
  normalizeHexColor,
} from '@axe/domain/character/import/imported-character';

export interface Column {
  key: string;
  label: string;
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
/** 保管庫のシートが持つ base64 の似顔絵。頭が付いていないものだけ足す。 */
export function normalizeImage(record: Record<string, unknown>): string {
  const raw = asString(record['base64Image']).trim();
  if (raw === '') return '';
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
}

/**
 * 保管庫のシートに共通する見出し。名前・色・似顔絵・メモと、元のシートへの入り口。
 *
 * ここから先の中身はシステムごとに違うが、ここまでは同じ場所に同じ名前で入っている。
 */
export function charasheetCharacterOf(record: Record<string, unknown>, dicebot: string): ImportedCharacter {
  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);
  character.dicebot = dicebot;
  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;
  return character;
}

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
