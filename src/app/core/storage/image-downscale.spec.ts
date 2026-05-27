import { downscaleImageBlob } from '@axe/core/storage/image-downscale';

describe('downscaleImageBlob', () => {
  it('blob が null なら null を返す', async () => {
    expect(await downscaleImageBlob(null, 80)).toBeNull();
  });

  it('maxDimension <= 0 のときは元 blob をそのまま返す (no-op)', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    expect(await downscaleImageBlob(blob, 0)).toBe(blob);
    expect(await downscaleImageBlob(blob, -1)).toBe(blob);
  });

  it('画像でない MIME type の blob はスキップして元 blob を返す (Image.onload に届かないハング回避)', async () => {
    const blob = new Blob(['plain text'], { type: 'text/plain' });
    expect(await downscaleImageBlob(blob, 80)).toBe(blob);
  });
});
