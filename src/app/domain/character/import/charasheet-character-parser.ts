import {
  classifyScalar,
  createEmptyImportedCharacter,
  ImportedCharacter,
  ImportedField,
  ImportedGroup,
  ImportedParam,
  ImportedSection,
  ImportedStatus,
  isNonEmptyScalar,
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

/**
 * 保管所 JSON は全システム共通で `{family}_name` 配列（＝行名）と一貫した列サフィックスを持つ。
 * family 接頭辞 → 節見出し。未知の family は接頭辞をそのまま使う。
 */
const FAMILY_LABELS: Record<string, string> = {
  skill: '技能',
  ippanskill: '一般技能',
  effect: '特技',
  easyeffect: 'コンボ',
  Power: '特技',
  power: '特技',
  ginou: '技能',
  jobginou: 'ジョブ技能',
  arms: '武器',
  item: '所持品',
  cls: 'クラス能力',
  spell: '呪文',
  magic: '魔法',
  acts: '行動',
  evades: '回避',
  roice: '未練',
  conne: 'コネ',
  friend: '仲間',
  implant: 'インプラント',
  ability: 'アビリティ',
};

/** 配列ファミリの列サフィックス → 列名。ホワイトリスト（未知の列は内部用とみなし出さない）。 */
const COLUMN_LABELS: Record<string, string> = {
  lv: 'レベル',
  Lv: 'レベル',
  Level: 'レベル',
  sl: 'レベル',
  tlv: '技能レベル',
  timing: 'タイミング',
  hantei: '判定',
  taisho: '対象',
  taishou: '対象',
  range: '射程',
  cost: 'コスト',
  memo: '効果',
  kouka: '効果',
  shozoku: '所属',
  zentei: '前提',
  eishou: '詠唱',
  attr: '属性',
  zokusei: '属性',
  keitou: '系統',
  nanido: '難易度',
  power: '威力',
  iryoku: '威力',
  critical: 'C値',
  damage: 'ダメージ',
  cate: 'カテゴリ',
  yoho: '用法',
  hit: '命中',
  type: '種別',
  Type: '種別',
  limit: '制限',
  price: '価格',
  tanka: '単価',
  weight: '重量',
  num: '個数',
  life: '耐久',
  mp: 'MP',
  dest: '部位',
  neg: '負の感情',
  pos: '対象',
  like: '好意',
  dislike: '敵意',
  page: 'ページ',
  total: '合計',
  sonota: 'その他',
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
 * `{family}_name` を持つ配列ファミリを、行名つきの節へ展開する（保管所フォーマットの共通規約）。
 * 行ラベル = `{family}_name[i]`、列ラベル = サフィックスを {@link COLUMN_LABELS} で日本語化。
 * 処理したキーは `handled` に追加し、CoC 等の名前なし配列は後段の {@link buildArraySections} へ回す。
 */
function buildNamedFamilySections(
  arrays: [string, unknown[]][],
  handled: Set<string>,
  uniqueSectionLabel: (base: string) => string
): ImportedSection[] {
  const families = arrays
    .filter(([key]) => key.endsWith('_name'))
    .map(([key]) => key.slice(0, -'_name'.length))
    .filter((family) => family.length > 0)
    .sort((a, b) => b.length - a.length);
  if (families.length === 0) return [];

  const arrayMap = new Map(arrays);
  const sections: ImportedSection[] = [];

  for (const family of families) {
    const names = arrayMap.get(`${family}_name`);
    if (!names) continue;
    handled.add(`${family}_name`);

    const columns: { key: string; label: string }[] = [];
    for (const [key, array] of arrays) {
      if (handled.has(key) || key === `${family}_name` || !key.startsWith(`${family}_`)) continue;
      if (array.length !== names.length) continue;
      const suffix = key.slice(family.length + 1);
      const label = COLUMN_LABELS[suffix];
      if (label == null) continue;
      columns.push({ key, label });
      handled.add(key);
    }

    const groups: ImportedGroup[] = [];
    names.forEach((rawName, index) => {
      const name = asString(rawName).trim();
      if (name === '') return;
      const fields: ImportedField[] = [];
      for (const column of columns) {
        const cell = (arrayMap.get(column.key) ?? [])[index];
        if (!isNonEmptyScalar(cell)) continue;
        const classified = classifyScalar(cell);
        fields.push({ label: column.label, value: classified.value, kind: classified.kind });
      }
      groups.push({ label: name, fields });
    });

    if (groups.length > 0) {
      sections.push({ label: uniqueSectionLabel(FAMILY_LABELS[family] ?? family), groups });
    }
  }
  return sections;
}

/**
 * 並列配列（技能の使用/初期値/ポイント…）を、接頭辞＋長さでグループ化し、
 * インデックスごとの行（group）へ zip する。行名を持たない CoC 系などのフォールバック。
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

export function parseCharasheetCharacter(
  parsed: unknown,
  labelMap: Record<string, string> = {}
): ImportedCharacter | null {
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
      scalarFields.push({ label: labelMap[key] ?? key, value: classified.value, kind: classified.kind });
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

  // 行名（{family}_name）を持つファミリを名前付き節へ。残りは従来どおりインデックス節へ。
  const namedSections = buildNamedFamilySections(arrayEntries, handled, uniqueSectionLabel);
  const remainingArrays = arrayEntries.filter(([key]) => !handled.has(key));

  const sections: ImportedSection[] = [];
  if (scalarFields.length > 0) {
    sections.push({ label: uniqueSectionLabel('データ'), groups: [{ label: '基本', fields: scalarFields }] });
  }
  sections.push(...namedSections);
  sections.push(...buildArraySections(remainingArrays, isCoc, uniqueSectionLabel));
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
