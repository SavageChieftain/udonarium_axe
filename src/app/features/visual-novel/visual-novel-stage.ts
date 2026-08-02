import { VnEmote } from '@axe/features/visual-novel/visual-novel-emote';

export const VN_STAGE_SLOT_COUNT = 12;
export const VN_STAGE_MAX = 6;
export const VN_STAGE_LOOKBACK = 60;

const SLOT_DUPLICATE_OFFSET = 4;
const LEFT_MIN = 8;
const LEFT_MAX = 92;

export interface VnStageSource {
  name: string;
  imageIdentifier: string;
  imagePos: number | null;
  isSystemMessage: boolean;
  isDicebot: boolean;
  isGameCharacter: boolean;
  isDiceCommand: boolean;
  emote: VnEmote;
}

export interface VnStageCharacter {
  name: string;
  url: string;
  left: number;
  slot: number;
  isActive: boolean;
  isFlipped: boolean;
}

export function slotOf(imagePos: number | null): number {
  if (imagePos == null || imagePos < 0 || imagePos >= VN_STAGE_SLOT_COUNT) return 0;
  return imagePos;
}

export function buildVnStage(
  window: readonly VnStageSource[],
  resolveUrl: (imageIdentifier: string) => string
): VnStageCharacter[] {
  const current = window[window.length - 1];
  if (!current) return [];
  if (current.emote.kind === 'location' || current.emote.kind === 'scene') return [];

  const found = new Map<string, { url: string; slot: number; isFlipped: boolean }>();
  for (let i = window.length - 1; i >= 0 && found.size < VN_STAGE_MAX; i--) {
    const source = window[i];
    if (source.isSystemMessage || source.isDicebot) continue;
    if (source.isDiceCommand) continue;
    if (source.emote.kind === 'scene') break;
    if (!source.isGameCharacter) continue;
    if (source.name.length < 1 || source.imageIdentifier.length < 1) continue;
    if (found.has(source.name)) continue;
    const url = resolveUrl(source.imageIdentifier);
    if (url.length < 1) continue;
    found.set(source.name, { url, slot: slotOf(source.imagePos), isFlipped: source.emote.flipped });
  }
  if (found.size < 1) return [];

  const activeName =
    !current.isSystemMessage && !current.isDicebot && !current.isDiceCommand && current.emote.kind === 'normal'
      ? current.name
      : '';

  const cast = [...found.entries()].sort(([nameA, a], [nameB, b]) => a.slot - b.slot || nameA.localeCompare(nameB));
  const slotCounts = new Map<number, number>();
  return cast.map(([name, info]) => {
    const duplicates = slotCounts.get(info.slot) ?? 0;
    slotCounts.set(info.slot, duplicates + 1);
    const left = ((info.slot + 0.5) / VN_STAGE_SLOT_COUNT) * 100 + duplicates * SLOT_DUPLICATE_OFFSET;
    return {
      name,
      url: info.url,
      left: Math.min(LEFT_MAX, Math.max(LEFT_MIN, left)),
      slot: info.slot,
      isActive: name === activeName,
      isFlipped: info.isFlipped,
    };
  });
}
