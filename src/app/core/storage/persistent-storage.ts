import { Logger } from '@axe/core/logging/logger';

/**
 * Keeps what is stored on the device from being deleted as space runs low.
 *
 * The database is best-effort by default, and the browser may drop all of it when space runs short.
 * That will not do for a recording someone means to watch later.
 */
export async function keepStoragePersistent(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage?.persist || !storage.persisted) return false;

  try {
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch (reason) {
    Logger.warn('[PersistentStorage] 保持を頼めませんでした', reason);
    return false;
  }
}

export interface StorageRoom {
  usedBytes: number;
  quotaBytes: number;
}

/** How much room is left, or null where the browser will not say. */
export async function storageRoom(): Promise<StorageRoom | null> {
  const storage = navigator.storage;
  if (!storage?.estimate) return null;

  try {
    const { usage, quota } = await storage.estimate();
    if (usage == null || quota == null) return null;
    return { usedBytes: usage, quotaBytes: quota };
  } catch (reason) {
    Logger.warn('[PersistentStorage] 空きを調べられませんでした', reason);
    return null;
  }
}
