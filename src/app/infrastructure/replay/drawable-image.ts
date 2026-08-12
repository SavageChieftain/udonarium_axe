import type { ReplayFrameImage } from '@axe/infrastructure/replay/replay-frame-painter';

export type DrawableImage = ReplayFrameImage & { close?(): void };

/**
 * 絵を canvas へ描ける形にする。
 *
 * 中身があれば `createImageBitmap` で decode を先に済ませる（描くたびに待たないため）。
 * 使い終わったら `close()` を呼ぶ側の責任で手放す。
 */
export async function toDrawableImage(blob: Blob | null, url: string): Promise<DrawableImage | null> {
  if (blob && typeof createImageBitmap === 'function') {
    return (await createImageBitmap(blob)) as DrawableImage;
  }
  if (url.length < 1) return null;
  return await new Promise((resolve, reject) => {
    const element = new Image();
    element.crossOrigin = 'anonymous';
    element.onload = () => resolve(element as unknown as ReplayFrameImage);
    element.onerror = () => reject(new Error(`読めない絵です: ${url}`));
    element.src = url;
  });
}
