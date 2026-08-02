export interface ExpiredBuffEntry {
  characterName: string;
  buffNames: string[];
}

/** 失効したバフを「誰の何が切れたか」の 1 行にまとめる。 */
export function formatExpiredBuffs(entries: ExpiredBuffEntry[]): string {
  return entries
    .filter((entry) => entry.buffNames.length > 0)
    .map((entry) => `${entry.characterName}: ${entry.buffNames.join('・')}`)
    .join(' / ');
}
