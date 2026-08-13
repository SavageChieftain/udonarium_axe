export async function compressAsync(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decompressAsync(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** gzip の目印。 */
const GZIP_MAGIC = [0x1f, 0x8b];

export function isCompressed(data: Uint8Array): boolean {
  return data.length > 2 && data[0] === GZIP_MAGIC[0] && data[1] === GZIP_MAGIC[1];
}

/**
 * 圧縮されていれば展開し、そうでなければそのまま返す。
 * 圧縮する前に書かれたデータが残っていても読めるようにするための入口。
 */
export async function decompressIfNeeded(data: Uint8Array): Promise<Uint8Array> {
  return isCompressed(data) ? decompressAsync(data) : data;
}
