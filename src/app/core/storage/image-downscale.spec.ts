import { convertBlobToWebP, downscaleImageBlob, isAnimatedPng, squareCropOf } from '@axe/core/storage/image-downscale';

describe('downscaleImageBlob', () => {
  it('returns nothing for no bytes', async () => {
    expect(await downscaleImageBlob(null, 80)).toBeNull();
  });

  it('returns nothing for nothing at all', async () => {
    expect(await downscaleImageBlob(undefined, 80)).toBeNull();
  });

  it('returns the bytes unchanged for a size of zero or less', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    expect(await downscaleImageBlob(blob, 0)).toBe(blob);
    expect(await downscaleImageBlob(blob, -1)).toBe(blob);
  });

  it('returns anything that is not an image unchanged, since it would never reach the load event', async () => {
    const blob = new Blob(['plain text'], { type: 'text/plain' });
    expect(await downscaleImageBlob(blob, 80)).toBe(blob);
  });

  it('still tries an image with no type, which never happens outside a test', async () => {
    const blob = new Blob(['raw']);
    expect(blob.type).toBe('');
    // Image events never arrive under happy-dom, so the wait always runs to the limit.
    // The usual three seconds would crowd the test timeout and fail only under load.
    const result = await downscaleImageBlob(blob, 80, { loadTimeoutMs: 20 });
    expect(result).toBeDefined();
  });
});

describe('squareCropOf', () => {
  it('takes a tall portrait from the top, where the face is', () => {
    expect(squareCropOf(400, 1200)).toEqual({ sx: 0, sy: 0, side: 400 });
  });

  it('takes a wide image from the middle across', () => {
    expect(squareCropOf(1200, 400)).toEqual({ sx: 400, sy: 0, side: 400 });
  });

  it('leaves a square as it is', () => {
    expect(squareCropOf(256, 256)).toEqual({ sx: 0, sy: 0, side: 256 });
  });
});

describe('convertBlobToWebP', () => {
  it('returns an animated gif unchanged', async () => {
    const blob = new Blob(['GIF89a'], { type: 'image/gif' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('returns an animated png unchanged', async () => {
    const blob = new Blob(['x'], { type: 'image/apng' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('returns a webp unchanged', async () => {
    const blob = new Blob(['x'], { type: 'image/webp' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('returns an svg unchanged', async () => {
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('returns anything that is not an image unchanged', async () => {
    const blob = new Blob(['text'], { type: 'text/plain' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('returns empty bytes unchanged', async () => {
    const blob = new Blob([], { type: 'image/png' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });
});

describe('isAnimatedPng', () => {
  function buildPngChunks(...chunkTypes: string[]): ArrayBuffer {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const parts: number[] = [...signature];
    for (const type of chunkTypes) {
      // length = 0 (empty data)
      parts.push(0, 0, 0, 0);
      // chunk type (4 ASCII chars)
      for (let i = 0; i < 4; i++) parts.push(type.charCodeAt(i));
      // CRC (dummy 4 bytes)
      parts.push(0, 0, 0, 0);
    }
    return new Uint8Array(parts).buffer;
  }

  it('reports animation when the control chunk comes before the data', () => {
    const buffer = buildPngChunks('IHDR', 'acTL', 'IDAT');
    expect(isAnimatedPng(buffer)).toBe(true);
  });

  it('reports none for an ordinary png', () => {
    const buffer = buildPngChunks('IHDR', 'IDAT');
    expect(isAnimatedPng(buffer)).toBe(false);
  });

  it('reports none for a buffer too short to tell', () => {
    expect(isAnimatedPng(new ArrayBuffer(4))).toBe(false);
  });

  it('reports none for an empty buffer', () => {
    expect(isAnimatedPng(new ArrayBuffer(0))).toBe(false);
  });
});
