export type VnMessageKind = 'normal' | 'narration' | 'location' | 'scene';
export type VnBubbleShape = 'normal' | 'thought' | 'shout' | 'whisper';
export type VnBubbleAnimation = 'none' | 'shake' | 'pop' | 'pulse' | 'float';
export type VnPortraitEmote = 'none' | 'jump' | 'tremble' | 'zoom' | 'nod' | 'sway' | 'droop';
export type VnEmotionMark = 'none' | 'surprise' | 'question' | 'anger' | 'sweat' | 'heart' | 'note' | 'silence';

export const VN_MESSAGE_KINDS: readonly VnMessageKind[] = ['normal', 'narration', 'location', 'scene'];
export const VN_BUBBLE_SHAPES: readonly VnBubbleShape[] = ['normal', 'thought', 'shout', 'whisper'];
export const VN_BUBBLE_ANIMATIONS: readonly VnBubbleAnimation[] = ['none', 'shake', 'pop', 'pulse', 'float'];
export const VN_PORTRAIT_EMOTES: readonly VnPortraitEmote[] = [
  'none',
  'jump',
  'tremble',
  'zoom',
  'nod',
  'sway',
  'droop',
];
export const VN_EMOTION_MARKS: readonly VnEmotionMark[] = [
  'none',
  'surprise',
  'question',
  'anger',
  'sweat',
  'heart',
  'note',
  'silence',
];

export interface VnEmote {
  kind: VnMessageKind;
  shape: VnBubbleShape;
  bubbleAnimation: VnBubbleAnimation;
  portraitEmote: VnPortraitEmote;
  emotionMark: VnEmotionMark;
  flipped: boolean;
  exited: boolean;
}

export const VN_EMOTE_DEFAULT: VnEmote = {
  kind: 'normal',
  shape: 'normal',
  bubbleAnimation: 'none',
  portraitEmote: 'none',
  emotionMark: 'none',
  flipped: false,
  exited: false,
};

const FLIP_TOKEN = '反転';
const EXIT_TOKEN = '退場';

const MESSAGE_KIND_TOKENS: Record<Exclude<VnMessageKind, 'normal'>, string> = {
  narration: '地の文',
  location: 'ロケーション',
  scene: '場面転換',
};

const SHAPE_TOKENS: Record<Exclude<VnBubbleShape, 'normal'>, string> = {
  thought: 'もやもや',
  shout: '叫び',
  whisper: 'ささやき',
};

const BUBBLE_ANIMATION_TOKENS: Record<Exclude<VnBubbleAnimation, 'none'>, string> = {
  shake: 'ゆれ',
  pop: 'ぽよん',
  pulse: 'ドキドキ',
  float: 'ふわふわ',
};

const PORTRAIT_EMOTE_TOKENS: Record<Exclude<VnPortraitEmote, 'none'>, string> = {
  jump: 'ジャンプ',
  tremble: 'ぶるぶる',
  zoom: 'ズーム',
  nod: 'うなずき',
  sway: 'ゆらゆら',
  droop: 'しょんぼり',
};

export const VN_EMOTION_MARK_CHARS: Record<Exclude<VnEmotionMark, 'none'>, string> = {
  surprise: '！',
  question: '？',
  anger: '💢',
  sweat: '💧',
  heart: '♥',
  note: '♪',
  silence: '…',
};

const SUFFIX_PATTERN = /\s*〔([^〔〕]+)〕\s*$/;

function invert<T extends string>(tokens: Record<T, string>): Map<string, T> {
  return new Map(Object.entries(tokens).map(([key, token]) => [token as string, key as T]));
}

const MESSAGE_KIND_BY_TOKEN = invert(MESSAGE_KIND_TOKENS);
const SHAPE_BY_TOKEN = invert(SHAPE_TOKENS);
const BUBBLE_ANIMATION_BY_TOKEN = invert(BUBBLE_ANIMATION_TOKENS);
const PORTRAIT_EMOTE_BY_TOKEN = invert(PORTRAIT_EMOTE_TOKENS);
const EMOTION_MARK_BY_TOKEN = invert(VN_EMOTION_MARK_CHARS);

export function buildVnEmoteSuffix(emote: VnEmote): string {
  const tokens: string[] = [];
  if (emote.kind !== 'normal') tokens.push(MESSAGE_KIND_TOKENS[emote.kind]);
  if (emote.shape !== 'normal') tokens.push(SHAPE_TOKENS[emote.shape]);
  if (emote.bubbleAnimation !== 'none') tokens.push(BUBBLE_ANIMATION_TOKENS[emote.bubbleAnimation]);
  if (emote.portraitEmote !== 'none') tokens.push(PORTRAIT_EMOTE_TOKENS[emote.portraitEmote]);
  if (emote.emotionMark !== 'none') tokens.push(VN_EMOTION_MARK_CHARS[emote.emotionMark]);
  if (emote.flipped) tokens.push(FLIP_TOKEN);
  if (emote.exited) tokens.push(EXIT_TOKEN);
  if (tokens.length < 1) return '';
  return ` 〔${tokens.join('・')}〕`;
}

export function parseVnEmote(text: string): VnEmote & { text: string } {
  const result = { ...VN_EMOTE_DEFAULT, text };
  const matched = SUFFIX_PATTERN.exec(text);
  if (!matched) return result;

  const tokens = matched[1].split('・').map((token) => token.trim());
  if (tokens.length < 1) return result;

  const parsed = { ...VN_EMOTE_DEFAULT };
  const seen = new Set<'kind' | 'shape' | 'bubble' | 'portrait' | 'mark' | 'flip' | 'exit'>();
  for (const token of tokens) {
    if (token === FLIP_TOKEN) {
      if (seen.has('flip')) return result;
      seen.add('flip');
      parsed.flipped = true;
      continue;
    }
    if (token === EXIT_TOKEN) {
      if (seen.has('exit')) return result;
      seen.add('exit');
      parsed.exited = true;
      continue;
    }
    const kind = MESSAGE_KIND_BY_TOKEN.get(token);
    if (kind) {
      if (seen.has('kind')) return result;
      seen.add('kind');
      parsed.kind = kind;
      continue;
    }
    const shape = SHAPE_BY_TOKEN.get(token);
    if (shape) {
      if (seen.has('shape')) return result;
      seen.add('shape');
      parsed.shape = shape;
      continue;
    }
    const bubbleAnimation = BUBBLE_ANIMATION_BY_TOKEN.get(token);
    if (bubbleAnimation) {
      if (seen.has('bubble')) return result;
      seen.add('bubble');
      parsed.bubbleAnimation = bubbleAnimation;
      continue;
    }
    const portraitEmote = PORTRAIT_EMOTE_BY_TOKEN.get(token);
    if (portraitEmote) {
      if (seen.has('portrait')) return result;
      seen.add('portrait');
      parsed.portraitEmote = portraitEmote;
      continue;
    }
    const emotionMark = EMOTION_MARK_BY_TOKEN.get(token);
    if (emotionMark) {
      if (seen.has('mark')) return result;
      seen.add('mark');
      parsed.emotionMark = emotionMark;
      continue;
    }
    return result;
  }

  return { ...parsed, text: text.slice(0, matched.index) };
}

export function splitVnEmoteSuffix(text: string): { text: string; suffix: string } {
  const parsed = parseVnEmote(text);
  if (parsed.text === text) return { text, suffix: '' };
  return { text: parsed.text, suffix: text.slice(parsed.text.length).trim() };
}
