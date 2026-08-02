import { createZipBlob, createZipBlobOnMainThread, readZipEntries } from '@axe/core/storage/zip-archive';
import { strToU8, unzipSync } from 'fflate';

async function unzipBlob(blob: Blob): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await blob.arrayBuffer()));
}

describe('createZipBlob()', () => {
  it('ワーカーが使えない環境ではメインスレッドで zip を作ること', async () => {
    const files = [
      new File([strToU8('<room />')], 'data.xml', { type: 'text/plain' }),
      new File([new Uint8Array([137, 80, 78, 71])], 'image.png', { type: 'image/png' }),
    ];

    const blob = await createZipBlob(files);

    expect(blob.type).toBe('application/zip');
    const entries = await unzipBlob(blob);
    expect(Object.keys(entries).sort()).toEqual(['data.xml', 'image.png']);
    expect(new TextDecoder().decode(entries['data.xml'])).toBe('<room />');
    expect([...entries['image.png']]).toEqual([137, 80, 78, 71]);
  });

  it('圧縮済みの画像も欠けずに往復できること', async () => {
    const payload = new Uint8Array(1024).map((_, index) => index % 251);
    const files = [new File([payload], 'photo.jpg', { type: 'image/jpeg' })];

    const entries = await unzipBlob(await createZipBlobOnMainThread(files));

    expect([...entries['photo.jpg']]).toEqual([...payload]);
  });

  it('ファイルが無くても空の zip を返すこと', async () => {
    const blob = await createZipBlob([]);

    expect(await unzipBlob(blob)).toEqual({});
  });
});

describe('readZipEntries()', () => {
  it('zip を展開して Blob と MIME タイプを返すこと', async () => {
    const blob = await createZipBlob([
      new File([strToU8('<room />')], 'data.xml', { type: 'text/plain' }),
      new File([new Uint8Array([1, 2, 3])], 'picture.webp', { type: 'image/webp' }),
    ]);

    const entries = await readZipEntries(blob);

    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    expect([...byName.keys()].sort()).toEqual(['data.xml', 'picture.webp']);
    expect(byName.get('picture.webp')?.type).toBe('image/webp');
    expect(await byName.get('data.xml')?.blob.text()).toBe('<room />');
    expect([...new Uint8Array(await byName.get('picture.webp')!.blob.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it('壊れた zip では失敗すること', async () => {
    await expect(readZipEntries(new Blob([new Uint8Array([0, 1, 2, 3])]))).rejects.toBeDefined();
  });
});
