import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  ImportedStatus,
  normalizeHexColor,
  toFiniteNumber,
} from '@axe/domain/character/import/imported-character';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function isScalar(value: unknown): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

function isNonEmptyScalar(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '';
}

/** 名前・色・画像など、別経路で扱うメタキー。データセクションには出さない。 */
const META_KEYS = new Set([
  'pc_name',
  'color',
  'base64Image',
  'url',
  'pc_making_environ',
  'pc_id',
  'password',
  'pc_password',
  'game',
  'SAN_Left',
  'SAN_Max',
  'SAN_Danger',
]);

/**
 * クトゥルフ（coc / coc7）の `NA{n}` 能力値キー → 表示名。
 * 保管所の CoC はフォーム位置で能力値を持つため、ここで人間可読なラベルへ写像する。
 */
const COC_ABILITY_LABELS: Record<string, string> = {
  NA1: 'STR',
  NA2: 'CON',
  NA3: 'POW',
  NA4: 'DEX',
  NA5: 'APP',
  NA6: 'SIZ',
  NA7: 'INT',
  NA8: 'EDU',
  NA9: 'HP',
  NA10: 'MP',
  NA11: '幸運',
  NA12: 'アイデア',
  NA13: '正気度初期',
  NA14: '知識',
};

/** CoC の技能配列キーの接頭辞 → カテゴリ表示名。未知の接頭辞は原文のまま使う。 */
const COC_SKILL_CATEGORY: Record<string, string> = {
  TBA: '戦闘技能',
  TFA: '探索技能',
  TAA: '行動技能',
  TCA: '交渉技能',
  TKA: '知識技能',
};

/** CoC の技能配列キーの末尾文字 → 列名。未知の末尾は原文のまま使う。 */
const COC_SKILL_COLUMN: Record<string, string> = {
  U: '使用',
  D: '初期値',
  S: '職業P',
  K: '趣味P',
  P: '合計',
  G: '成長',
};

export function isCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  return typeof (parsed as Record<string, unknown>)['pc_name'] === 'string';
}

/** `N{X}` / `M{X}` 命名の現在値・最大値ペアをリソースとして取り出す（一部システムが採る規約）。 */
function parsePairedStatuses(record: Record<string, unknown>, handled: Set<string>): ImportedStatus[] {
  const statuses: ImportedStatus[] = [];
  for (const key of Object.keys(record)) {
    const match = /^N(.+)$/.exec(key);
    if (!match) continue;
    const maxKey = `M${match[1]}`;
    if (!(maxKey in record) || !isScalar(record[key]) || !isScalar(record[maxKey])) continue;
    const max = toFiniteNumber(record[maxKey], 0);
    statuses.push({ label: match[1], value: toFiniteNumber(record[key], max), max });
    handled.add(key);
    handled.add(maxKey);
  }
  return statuses;
}

function parseSanStatus(record: Record<string, unknown>): ImportedStatus | null {
  if (!('SAN_Max' in record) || !isScalar(record['SAN_Max'])) return null;
  const max = toFiniteNumber(record['SAN_Max'], 0);
  const left = isNonEmptyScalar(record['SAN_Left']) ? toFiniteNumber(record['SAN_Left'], max) : max;
  return { label: '正気度', value: left, max };
}

function parseCocAbilities(record: Record<string, unknown>, handled: Set<string>): ImportedParam[] {
  const params: ImportedParam[] = [];
  for (const [key, label] of Object.entries(COC_ABILITY_LABELS)) {
    if (isNonEmptyScalar(record[key])) {
      params.push({ label, value: asString(record[key]) });
      handled.add(key);
    }
  }
  return params;
}

function arrayPrefix(key: string): string {
  return key.length <= 1 ? key : key.slice(0, -1);
}

/**
 * 並列配列（技能の使用/初期値/ポイント…）を、接頭辞＋長さでグループ化し、
 * インデックスごとの行（group）へ zip する。技能名は保管所 JSON に無いため行番号で表す。
 * 全列が空の行はスキップする。
 */
function buildArraySections(
  arrays: [string, unknown[]][],
  isCoc: boolean,
  uniqueSectionLabel: (base: string) => string
): ImportedSection[] {
  const buckets = new Map<string, [string, unknown[]][]>();
  for (const entry of arrays) {
    const bucketKey = `${arrayPrefix(entry[0])}|${entry[1].length}`;
    const bucket = buckets.get(bucketKey);
    if (bucket) bucket.push(entry);
    else buckets.set(bucketKey, [entry]);
  }

  const sections: ImportedSection[] = [];
  for (const bucket of buckets.values()) {
    const prefix = arrayPrefix(bucket[0][0]);
    const length = bucket[0][1].length;
    // 並列配列が複数あるときだけ接頭辞でまとめる。単独配列はフルキー名を見出しにする。
    const baseLabel = bucket.length >= 2 ? (isCoc && COC_SKILL_CATEGORY[prefix]) || prefix : bucket[0][0];
    const sectionLabel = uniqueSectionLabel(baseLabel);
    const groups: ImportedGroup[] = [];

    for (let i = 0; i < length; i++) {
      const fields: ImportedField[] = [];
      for (const [key, array] of bucket) {
        const cell = array[i];
        if (!isNonEmptyScalar(cell)) continue;
        const column = (isCoc && COC_SKILL_COLUMN[key.slice(-1)]) || key;
        const classified = classifyScalar(cell);
        fields.push({ label: column, value: classified.value, kind: classified.kind });
      }
      if (fields.length > 0) groups.push({ label: `${sectionLabel} ${i + 1}`, fields });
    }
    if (groups.length > 0) sections.push({ label: sectionLabel, groups });
  }
  return sections;
}

export function parseCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  if (!isCharasheetCharacter(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const game = asString(record['game']);
  const isCoc = game === 'coc' || game === 'coc7';

  const character = createEmptyImportedCharacter('charasheet');
  character.name = asString(record['pc_name']).trim();
  character.color = normalizeHexColor(record['color']);
  character.iconUrl = normalizeImage(record);
  character.memo = asString(record['pc_making_environ']);

  const handled = new Set(META_KEYS);

  const san = parseSanStatus(record);
  character.statuses = [...(san ? [san] : []), ...parsePairedStatuses(record, handled)];

  if (isCoc) character.params = parseCocAbilities(record, handled);

  const scalarFields: ImportedField[] = [];
  const arrayEntries: [string, unknown[]][] = [];
  for (const [key, raw] of Object.entries(record)) {
    if (handled.has(key) || raw == null) continue;
    if (Array.isArray(raw)) {
      if (raw.length > 0) arrayEntries.push([key, raw]);
    } else if (isNonEmptyScalar(raw)) {
      const classified = classifyScalar(raw);
      scalarFields.push({ label: key, value: classified.value, kind: classified.kind });
    }
  }

  const usedSectionLabels = new Set<string>();
  const uniqueSectionLabel = (base: string): string => {
    let label = base;
    let counter = 2;
    while (usedSectionLabels.has(label)) label = `${base}_${counter++}`;
    usedSectionLabels.add(label);
    return label;
  };

  const sections: ImportedSection[] = [];
  if (scalarFields.length > 0) {
    sections.push({ label: uniqueSectionLabel('データ'), groups: [{ label: '基本', fields: scalarFields }] });
  }
  sections.push(...buildArraySections(arrayEntries, isCoc, uniqueSectionLabel));
  character.sections = sections;

  const url = asString(record['url']).trim();
  if (url !== '') character.externalUrl = url;

  return character;
}

export function normalizeImage(record: Record<string, unknown>): string {
  const raw = asString(record['base64Image']).trim();
  if (raw === '') return '';
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
}
