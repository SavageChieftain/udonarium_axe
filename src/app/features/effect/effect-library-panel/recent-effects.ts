/** 直近に使ったエフェクト。卓中は同じものを繰り返し撃つので、一覧の先頭へ出す。 */

const STORAGE_KEY = 'axe.effect.recent';
const MAX_RECENT = 8;

export function readRecentEffects(storage: Storage | null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentEffect(storage: Storage | null, identifier: string): string[] {
  const next = [identifier, ...readRecentEffects(storage).filter((entry) => entry !== identifier)].slice(0, MAX_RECENT);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 保存できなくても一覧は動く */
  }
  return next;
}
