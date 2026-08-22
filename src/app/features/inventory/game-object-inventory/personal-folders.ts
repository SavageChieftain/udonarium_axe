const STORAGE_KEY = 'axe.inventory.personal-folders';

export function readPersonalFolders(storage: Storage | null): string[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  } catch {
    return [];
  }
}

export function writePersonalFolders(storage: Storage | null, folderPaths: readonly string[]): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...folderPaths]));
  } catch {
    // A browser that refuses to store this still has to run.
  }
}
