export interface ExpiredBuffEntry {
  characterName: string;
  buffNames: string[];
}

/** Gathers the buffs that ran out into one line: whose, and which. */
export function formatExpiredBuffs(entries: ExpiredBuffEntry[]): string {
  return entries
    .filter((entry) => entry.buffNames.length > 0)
    .map((entry) => `${entry.characterName}: ${entry.buffNames.join('・')}`)
    .join(' / ');
}
