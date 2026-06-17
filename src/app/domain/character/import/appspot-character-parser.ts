import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  ImportedStatus,
  toFiniteNumber,
} from '@axe/domain/character/import/imported-character';

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

function isScalar(value: unknown): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

/** トップレベルキー → 日本語見出し。未知のシステム/キーは原文キーのまま見出しにする（情報は落とさない）。 */
const SECTION_LABELS: Record<string, string> = {
  base: 'プロフィール',
  skills: '技能',
  skill: '技能',
  combo: 'コンボ',
  combos: 'コンボ',
  weapons: '武器',
  armours: '防具',
  armors: '防具',
  items: 'アイテム',
  arts: 'エフェクト',
  powers: '特技',
  ninpou: '忍法',
  lois: 'ロイス',
  memory: 'メモリー',
  exp: '経験点',
  lifepath: 'ライフパス',
  ea: 'EA',
  erotion: 'エロージョン',
  outline: '設定',
  display: '表示',
  spell: '呪文',
  spells: '呪文',
};

const HANDLED_TOP_LEVEL = new Set(['base', 'baseAbility', 'subAbility']);

function sectionLabel(key: string): string {
  return SECTION_LABELS[key] ?? key;
}

function hasCharacterShape(record: Record<string, unknown> | null): boolean {
  if (!record) return false;
  const base = asRecord(record['base']);
  if (base != null && typeof base['name'] === 'string') return true;
  return asRecord(record['baseAbility']) != null;
}

/**
 * キャラクターシート倉庫 (character-sheets.appspot.com) のキャラクター本体を取り出す。
 * 系統により `data` でラップされる場合とトップレベルに展開される場合があるため吸収する。
 */
function resolveRoot(parsed: Record<string, unknown>): Record<string, unknown> {
  if (hasCharacterShape(parsed)) return parsed;
  const data = asRecord(parsed['data']);
  if (hasCharacterShape(data)) return data!;
  return parsed;
}

export function isAppspotCharacter(parsed: unknown): boolean {
  const record = asRecord(parsed);
  if (!record) return false;
  return hasCharacterShape(record) || hasCharacterShape(asRecord(record['data']));
}

/**
 * ネストしたオブジェクト/配列を、ドット記法のラベルへ平坦化したフィールド列にする。
 * detail ツリーの深さ制限（section > group > field）に収めつつ全項目を残すための処理。
 */
function flattenFields(source: Record<string, unknown>, prefix: string): ImportedField[] {
  const fields: ImportedField[] = [];
  for (const [key, raw] of Object.entries(source)) {
    if (raw == null) continue;
    const label = prefix === '' ? key : `${prefix}.${key}`;
    if (isScalar(raw)) {
      if (typeof raw === 'string' && raw.trim() === '') continue;
      const classified = classifyScalar(raw);
      fields.push({ label, value: classified.value, kind: classified.kind });
    } else if (Array.isArray(raw)) {
      raw.forEach((element, index) => {
        const itemLabel = `${label}[${index + 1}]`;
        const child = asRecord(element);
        if (child) fields.push(...flattenFields(child, itemLabel));
        else if (isScalar(element)) {
          const classified = classifyScalar(element);
          fields.push({ label: itemLabel, value: classified.value, kind: classified.kind });
        }
      });
    } else {
      const child = asRecord(raw);
      if (child) fields.push(...flattenFields(child, label));
    }
  }
  return fields;
}

/** 配列（武器・コンボ等）の各要素を 1 グループ（行）へ。全 null の空要素はスキップ。 */
function arrayToGroups(keyLabel: string, array: unknown[]): ImportedGroup[] {
  const groups: ImportedGroup[] = [];
  array.forEach((element, index) => {
    const record = asRecord(element);
    if (record) {
      const fields = flattenFields(record, '');
      if (fields.length === 0) return;
      const name = asString(record['name'] ?? record['name1']).trim();
      groups.push({ label: name === '' ? `${keyLabel} ${index + 1}` : name, fields });
    } else if (isScalar(element)) {
      const classified = classifyScalar(element);
      groups.push({
        label: `${keyLabel} ${index + 1}`,
        fields: [{ label: keyLabel, value: classified.value, kind: classified.kind }],
      });
    }
  });
  return groups;
}

/** オブジェクト（プロフィール等）をセクションへ。スカラーは「基本」グループ、入れ子は個別グループ。 */
function objectToSection(label: string, source: Record<string, unknown>): ImportedSection | null {
  const baseFields: ImportedField[] = [];
  const groups: ImportedGroup[] = [];
  for (const [key, raw] of Object.entries(source)) {
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      groups.push(...arrayToGroups(key, raw));
    } else if (isScalar(raw)) {
      if (typeof raw === 'string' && raw.trim() === '') continue;
      const classified = classifyScalar(raw);
      baseFields.push({ label: key, value: classified.value, kind: classified.kind });
    } else {
      const child = asRecord(raw);
      if (!child) continue;
      const fields = flattenFields(child, '');
      if (fields.length > 0) groups.push({ label: key, fields });
    }
  }
  if (baseFields.length > 0) groups.unshift({ label: '基本', fields: baseFields });
  return groups.length > 0 ? { label, groups } : null;
}

function scalarToSection(label: string, raw: string | number): ImportedSection {
  const classified = classifyScalar(raw);
  return { label, groups: [{ label: '基本', fields: [{ label, value: classified.value, kind: classified.kind }] }] };
}

/** `{ key: { total: number } }` 構造から各キーの total を取り出す（能力値・サブ能力）。 */
function collectTotals(container: unknown): { label: string; value: number }[] {
  const record = asRecord(container);
  if (!record) return [];
  const result: { label: string; value: number }[] = [];
  for (const [key, raw] of Object.entries(record)) {
    const child = asRecord(raw);
    if (!child || !('total' in child)) continue;
    if (!isScalar(child['total'])) continue;
    result.push({ label: key, value: toFiniteNumber(child['total'], 0) });
  }
  return result;
}

function buildSections(root: Record<string, unknown>): ImportedSection[] {
  const sections: ImportedSection[] = [];

  const base = asRecord(root['base']);
  if (base) {
    const profile: Record<string, unknown> = { ...base };
    delete profile['name'];
    const section = objectToSection(sectionLabel('base'), profile);
    if (section) sections.push(section);
  }

  for (const [key, raw] of Object.entries(root)) {
    if (HANDLED_TOP_LEVEL.has(key) || raw == null) continue;
    const label = sectionLabel(key);
    if (Array.isArray(raw)) {
      const groups = arrayToGroups(label, raw);
      if (groups.length > 0) sections.push({ label, groups });
    } else if (isScalar(raw)) {
      if (typeof raw === 'string' && raw.trim() === '') continue;
      sections.push(scalarToSection(label, raw));
    } else {
      const child = asRecord(raw);
      if (!child) continue;
      const section = objectToSection(label, child);
      if (section) sections.push(section);
    }
  }

  return sections;
}

export function parseAppspotCharacter(parsed: unknown): ImportedCharacter | null {
  const record = asRecord(parsed);
  if (!record || !isAppspotCharacter(record)) return null;
  const root = resolveRoot(record);
  const base = asRecord(root['base']);

  const character = createEmptyImportedCharacter('appspot');
  character.name = asString(base?.['name'] ?? root['name']).trim();

  const statuses: ImportedStatus[] = collectTotals(root['subAbility']).map((entry) => ({
    label: entry.label,
    value: entry.value,
    max: entry.value,
  }));
  character.statuses = statuses;

  const params: ImportedParam[] = collectTotals(root['baseAbility']).map((entry) => ({
    label: entry.label,
    value: String(entry.value),
  }));
  character.params = params;

  character.sections = buildSections(root);

  return character;
}
