/**
 * The effect token written into a line of chat.
 *
 * Written after the roll and the damage, the effect plays after both.
 * The double brackets are free in the chat notation, as the novel mode's own brackets
 * are, so they collide with neither the dice nor the resource changes.
 */

const TOKEN_PATTERN = /《([^《》]+)》/g;

export interface EffectChatToken {
  /** The name of the effect called for. */
  name: string;
  /** The line with the token taken out. */
  text: string;
}

/** Takes the first effect token out of a line. Null when there is none. */
export function parseEffectChatToken(text: string): EffectChatToken | null {
  TOKEN_PATTERN.lastIndex = 0;
  const matched = TOKEN_PATTERN.exec(text);
  if (!matched) return null;

  const name = matched[1].trim();
  if (name.length < 1) return null;

  return { name, text: stripEffectChatTokens(text) };
}

/** Takes every effect token out of a line. */
export function stripEffectChatTokens(text: string): string {
  return text
    .replace(TOKEN_PATTERN, '')
    .replace(/[\s\u3000]{2,}/g, ' ')
    .trim();
}

/** The token added to a palette row. */
export function buildEffectChatToken(name: string): string {
  return `《${name}》`;
}
