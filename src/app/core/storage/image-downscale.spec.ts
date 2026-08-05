import { convertBlobToWebP, downscaleImageBlob, isAnimatedPng } from '@axe/core/storage/image-downscale';

describe('downscaleImageBlob', () => {
  it('blob が null なら null を返す', async () => {
    expect(await downscaleImageBlob(null, 80)).toBeNull();
  });

  it('blob が undefined なら null を返す', async () => {
    expect(await downscaleImageBlob(undefined, 80)).toBeNull();
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

  it('type 未指定の画像 blob は拒否せず処理を試みる (実環境では必ず type が付く)', async () => {
    const blob = new Blob(['raw']);
    expect(blob.type).toBe('');
    // happy-dom では Image のイベントが来ないので、読み込み待ちは必ず上限まで待つ。
    // 既定の 3 秒を待つとテスト自体の制限に近づき、負荷が乗ったときだけ落ちる。
    const result = await downscaleImageBlob(blob, 80, { loadTimeoutMs: 20 });
    expect(result).toBeDefined();
  });
});

describe('convertBlobToWebP', () => {
  it('GIF はスキップして元 blob を返す', async () => {
    const blob = new Blob(['GIF89a'], { type: 'image/gif' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('APNG (image/apng) はスキップして元 blob を返す', async () => {
    const blob = new Blob(['x'], { type: 'image/apng' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('WebP はスキップして元 blob を返す', async () => {
    const blob = new Blob(['x'], { type: 'image/webp' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('SVG はスキップして元 blob を返す', async () => {
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('画像でない MIME type はスキップして元 blob を返す', async () => {
    const blob = new Blob(['text'], { type: 'text/plain' });
    expect(await convertBlobToWebP(blob)).toBe(blob);
  });

  it('空 blob はそのまま返す', async () => {
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

  it('acTL チャンクが IDAT より前にあれば true (APNG)', () => {
    const buffer = buildPngChunks('IHDR', 'acTL', 'IDAT');
    expect(isAnimatedPng(buffer)).toBe(true);
  });

  it('acTL が無く IDAT があれば false (通常 PNG)', () => {
    const buffer = buildPngChunks('IHDR', 'IDAT');
    expect(isAnimatedPng(buffer)).toBe(false);
  });

  it('バッファが短すぎれば false', () => {
    expect(isAnimatedPng(new ArrayBuffer(4))).toBe(false);
  });

  it('空バッファは false', () => {
    expect(isAnimatedPng(new ArrayBuffer(0))).toBe(false);
  });
});
