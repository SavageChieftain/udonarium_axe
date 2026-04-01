import { Logger } from '@axe/core/logging/logger';

export async function compressAsync(data: Uint8Array, _chunkSize?: number): Promise<Uint8Array> {
  try {
    const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (e) {
    Logger.error('[Compress] 圧縮エラー', e);
  }
  return null!;
}

export async function decompressAsync(data: Uint8Array, _chunkSize?: number): Promise<Uint8Array> {
  try {
    const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (e) {
    Logger.error('[Compress] 解凍エラー', e);
  }
  return null!;
}
