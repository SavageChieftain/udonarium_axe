import { createThumbnailInWorker } from '@axe/core/storage/image-thumbnail';

describe('createThumbnailInWorker()', () => {
  it('returns nothing without a worker or an offscreen canvas, leaving the caller to fall back', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });

    await expect(createThumbnailInWorker(blob, 'image/webp', 128)).resolves.toBeNull();
  });
});
