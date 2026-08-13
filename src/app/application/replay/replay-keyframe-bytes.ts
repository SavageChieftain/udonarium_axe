import { decompressIfNeeded } from '@axe/core/util/compress';

/**
 * 置き場から読んだ盤面の中身。
 *
 * 盤面は部屋まるごとなので圧縮して置いている。圧縮する前に録った分がそのまま残って
 * いるため、目印を見て要るときだけ展開する。
 */
export async function readKeyframeBytes(blob: Blob): Promise<Uint8Array> {
  return decompressIfNeeded(new Uint8Array(await blob.arrayBuffer()));
}
