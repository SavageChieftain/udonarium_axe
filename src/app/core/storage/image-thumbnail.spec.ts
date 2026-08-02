import { createThumbnailInWorker } from '@axe/core/storage/image-thumbnail';

describe('createThumbnailInWorker()', () => {
  it('ワーカーや OffscreenCanvas が無い環境では null を返して呼び出し側にフォールバックさせること', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });

    await expect(createThumbnailInWorker(blob, 'image/webp', 128)).resolves.toBeNull();
  });
});
