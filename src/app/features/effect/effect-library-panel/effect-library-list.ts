import { EffectPreset } from '@axe/domain/effect/effect-preset';

/** 一覧の並べ替えと絞り込み。パネルから切り離して spec で固定する。 */

export interface EffectLibraryGroup {
  tag: string;
  presets: EffectPreset[];
}

/** 既定プリセットの系統。ここに載っている順で並べ、知らない系統は後ろへ回す。 */
const TAG_ORDER: readonly string[] = [
  '物理',
  '打撃',
  '射撃',
  '炎',
  '雷',
  '氷',
  '土',
  '風',
  '闇',
  '時空',
  '回復',
  '状態異常',
  '防御',
  '強化',
  '撃破',
  '範囲',
];

export function matchesQuery(preset: EffectPreset, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return true;
  return `${preset.name} ${preset.tagName}`.toLowerCase().includes(needle);
}

/** 単体しか狙えないか、複数を巻き込めるか。 */
export type TargetingFilter = 'single' | 'multi';

export function isMultiTarget(preset: EffectPreset): boolean {
  return preset.targetLimit > 1;
}

export function filterPresets(
  presets: readonly EffectPreset[],
  query: string,
  tag: string | null,
  grade: number | null,
  targeting: TargetingFilter | null = null,
  isGameMaster = true
): EffectPreset[] {
  return presets.filter(
    (preset) =>
      // GM 専用は卓の仕込みなので、PL の一覧には名前ごと出さない。
      (isGameMaster || !preset.gmOnly) &&
      matchesQuery(preset, query) &&
      (tag == null || preset.tagName === tag) &&
      (grade == null || preset.gradeLevel === grade) &&
      (targeting == null || isMultiTarget(preset) === (targeting === 'multi'))
  );
}

/** 系統ごとにまとめ、系統内は等級順（同じ等級なら名前順）に並べる。 */
export function groupPresets(presets: readonly EffectPreset[]): EffectLibraryGroup[] {
  const groups = new Map<string, EffectPreset[]>();
  for (const preset of presets) {
    const tag = preset.tagName.trim();
    const bucket = groups.get(tag);
    if (bucket) bucket.push(preset);
    else groups.set(tag, [preset]);
  }

  return [...groups.entries()]
    .map(([tag, list]) => ({
      tag,
      presets: [...list].sort((left, right) => left.gradeLevel - right.gradeLevel || compareName(left, right)),
    }))
    .sort((left, right) => tagRank(left.tag) - tagRank(right.tag) || left.tag.localeCompare(right.tag));
}

export function collectTags(presets: readonly EffectPreset[]): string[] {
  const tags = new Set<string>();
  for (const preset of presets) {
    const tag = preset.tagName.trim();
    if (tag.length > 0) tags.add(tag);
  }
  return [...tags].sort((left, right) => tagRank(left) - tagRank(right) || left.localeCompare(right));
}

function tagRank(tag: string): number {
  if (tag.length < 1) return TAG_ORDER.length + 1;
  const index = TAG_ORDER.indexOf(tag);
  return index < 0 ? TAG_ORDER.length : index;
}

function compareName(left: EffectPreset, right: EffectPreset): number {
  return left.name.localeCompare(right.name, 'ja');
}
