import { decompressIfNeeded } from '@axe/core/util/compress';

/**
 * The board as it was read out of storage.
 *
 * A board is a whole room, so it is stored compressed. Recordings made before that are still
 * stored plain, so the magic number decides whether to decompress.
 */
export async function readKeyframeBytes(blob: Blob): Promise<Uint8Array> {
  return decompressIfNeeded(new Uint8Array(await blob.arrayBuffer()));
}
