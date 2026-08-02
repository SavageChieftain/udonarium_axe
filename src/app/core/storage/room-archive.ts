export const CCFOLIA_ROOM_DATA_ENTRY = '__data.json';

export type ArchiveEntries = Record<string, Uint8Array>;

/**
 * ココフォリアのルームデータ ZIP か判定する。AXE 自身の保存 ZIP は data.xml 等を持つため衝突しない。
 */
export function isCcfoliaRoomArchive(entryNames: string[]): boolean {
  return entryNames.includes(CCFOLIA_ROOM_DATA_ENTRY);
}
