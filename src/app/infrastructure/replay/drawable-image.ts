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

export interface DrawableImageSource {
  get(identifier: string): { blob: Blob | null; url: string } | null;
}

/**
 * 使う絵をまとめて読む。
 *
 * 1 枚ずつ待つと枚数分だけ待たされる。読むのは互いに無関係なので同時に走らせる。
 * このブラウザに残っていない絵は飛ばす（描く側が空きとして扱う）。
 */
export async function loadDrawableImages(
  storage: DrawableImageSource,
  identifiers: readonly string[],
  onMissing?: (identifier: string, reason?: unknown) => void
): Promise<Map<string, DrawableImage>> {
  const wanted = [...new Set(identifiers.filter((identifier) => identifier.length > 0))];
  const decoded = await Promise.all(
    wanted.map(async (identifier) => {
      const image = storage.get(identifier);
      if (!image) {
        onMissing?.(identifier);
        return null;
      }
      try {
        return await toDrawableImage(image.blob, image.url);
      } catch (reason) {
        onMissing?.(identifier, reason);
        return null;
      }
    })
  );

  const loaded = new Map<string, DrawableImage>();
  for (const [index, drawable] of decoded.entries()) {
    if (drawable) loaded.set(wanted[index], drawable);
  }
  return loaded;
}
