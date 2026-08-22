import { isVnPortraitPosSet, toPortraitSlot } from '@axe/domain/visual-novel/vn-portrait-position';
import { VnEmote } from '@axe/features/visual-novel/visual-novel-emote';

export const VN_STAGE_SLOT_COUNT = 12;
export const VN_STAGE_MAX = 6;
export const VN_STAGE_LOOKBACK = 60;

const LEFT_MIN = 8;
const LEFT_MAX = 92;
const LEFT_SPAN = LEFT_MAX - LEFT_MIN;

export const VN_STAGE_MIN_GAP = LEFT_SPAN / (VN_STAGE_SLOT_COUNT - 1);

export interface VnStageSource {
  name: string;
  sendFrom: string;
  imageIdentifier: string;
  imagePos: unknown;
  vnPortraitPos: number;
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

/** The same span the chat portraits use, so slot 0 and slot 11 land on the same edges. */
export function leftOfSlot(slot: number): number {
  return LEFT_MIN + LEFT_SPAN * (slot / (VN_STAGE_SLOT_COUNT - 1));
}

export function slotOf(imagePos: number | null): number {
  if (imagePos == null || imagePos < 0 || imagePos >= VN_STAGE_SLOT_COUNT) return 0;
  return imagePos;
}

/** What a message alone can say about where its speaker stands. */
export function messageSlotOf(source: VnStageSource): number {
  if (isVnPortraitPosSet(source.vnPortraitPos)) return source.vnPortraitPos;
  return toPortraitSlot(source.imagePos) ?? 0;
}

/**
 * Keeps `desired` in order and at least `gap` apart within `min`..`max`.
 * `desired` must be ascending: the pass pushes rather than reorders.
 */
export function spreadStagePositions(desired: readonly number[], gap: number, min: number, max: number): number[] {
  const clamp = (value: number) => Math.min(max, Math.max(min, value));
  if (desired.length < 1) return [];
  if (desired.length < 2) return [clamp(desired[0])];

  const step = Math.min(gap, (max - min) / (desired.length - 1));
  const spread = [clamp(desired[0])];
  for (let i = 1; i < desired.length; i++) {
    spread.push(Math.max(clamp(desired[i]), spread[i - 1] + step));
  }

  if (spread[spread.length - 1] > max) {
    spread[spread.length - 1] = max;
    for (let i = spread.length - 2; i >= 0; i--) {
      spread[i] = Math.min(spread[i], spread[i + 1] - step);
    }
  }
  return spread;
}

/**
 * A cast entirely on slot 0 is a room that never touched the setting, since that is what every
 * character is made with, so it is spread over the whole stage instead of stacked on the left.
 * Anywhere else is taken as meant and only nudged apart.
 */
function desiredPositions(slots: readonly number[]): number[] {
  if (slots.length > 1 && slots.every((slot) => slot === 0)) {
    return slots.map((_, index) => LEFT_MIN + LEFT_SPAN * ((index + 0.5) / slots.length));
  }
  return slots.map(leftOfSlot);
}

export function buildVnStage(
  window: readonly VnStageSource[],
  resolveUrl: (imageIdentifier: string) => string,
  resolveSlot: (source: VnStageSource) => number = messageSlotOf
): VnStageCharacter[] {
  const current = window[window.length - 1];
  if (!current) return [];
  if (current.emote.kind === 'location' || current.emote.kind === 'scene') return [];

  const found = new Map<string, { url: string; slot: number; isFlipped: boolean }>();
  const retired = new Set<string>();
  for (let i = window.length - 1; i >= 0 && found.size < VN_STAGE_MAX; i--) {
    const source = window[i];
    if (source.isSystemMessage || source.isDicebot) continue;
    if (source.isDiceCommand) continue;
    if (source.emote.kind === 'scene') break;
    if (!source.isGameCharacter) continue;
    if (source.name.length < 1 || source.imageIdentifier.length < 1) continue;
    if (found.has(source.name) || retired.has(source.name)) continue;
    if (source.emote.exited) {
      retired.add(source.name);
      continue;
    }
    const url = resolveUrl(source.imageIdentifier);
    if (url.length < 1) continue;
    found.set(source.name, { url, slot: slotOf(resolveSlot(source)), isFlipped: source.emote.flipped });
  }
  if (found.size < 1) return [];

  const activeName =
    !current.isSystemMessage && !current.isDicebot && !current.isDiceCommand && current.emote.kind === 'normal'
      ? current.name
      : '';

  const cast = [...found.entries()].sort(([nameA, a], [nameB, b]) => a.slot - b.slot || nameA.localeCompare(nameB));
  const lefts = spreadStagePositions(
    desiredPositions(cast.map(([, info]) => info.slot)),
    VN_STAGE_MIN_GAP,
    LEFT_MIN,
    LEFT_MAX
  );
  return cast.map(([name, info], index) => ({
    name,
    url: info.url,
    left: lefts[index],
    slot: info.slot,
    isActive: name === activeName,
    isFlipped: info.isFlipped,
  }));
}
