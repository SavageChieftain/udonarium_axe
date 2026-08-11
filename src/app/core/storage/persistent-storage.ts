import { Logger } from '@axe/core/logging/logger';

/**
 * 端末に置いたデータを、空きが減ったときに勝手に消されないようにする。
 *
 * IndexedDB は既定では「捨ててよい」扱いで、空き容量が減るとブラウザの判断で丸ごと消える。
 * 録画のように後から見返すものは、それでは困る。
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

/** 端末に置ける残り。分からない環境では null。 */
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
