/** The effects used lately. The same ones are fired over and over during a session, so they go to the front of the list. */

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
    /* The list works even when it cannot save. */
  }
  return next;
}
