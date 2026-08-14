export const CCFOLIA_ROOM_DATA_ENTRY = '__data.json';

export type ArchiveEntries = Record<string, Uint8Array>;

/**
 * Recognises a room archive from the other tool. Our own carries room data instead, so the two never collide.
 */
export function isCcfoliaRoomArchive(entryNames: string[]): boolean {
  return entryNames.includes(CCFOLIA_ROOM_DATA_ENTRY);
}
