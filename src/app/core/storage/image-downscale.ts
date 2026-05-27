/**
 * Blob 画像を最大辺 maxDimension まで canvas でリサンプルしたうえで Blob に書き戻す。
 *
 * - 元画像が maxDimension 以下なら何もせず元 Blob を返す。
 * - ブラウザ以外 (Node / happy-dom 等) や canvas 未対応環境では何もせず元 Blob を返す。
 * - 縮小結果が元より大きくなった場合 (低解像度元画像など) も元 Blob を返す。
 *
 * 主にチャットログ HTML エクスポートで base64 化前の立ち絵を一気に小さくするために使う。
 */
export async function downscaleImageBlob(blob: Blob | null | undefined, maxDimension: number): Promise<Blob | null> {
  if (!blob) return blob ?? null;
  if (maxDimension <= 0) return blob;
  // 画像でない blob (テスト用の text/plain など) を canvas に通そうとすると
  // happy-dom 等では Image.onload/onerror が発火せず Promise が宙ぶらりになる。
  // MIME で先にガードする。type 未指定の blob は通す (実環境では image storage 起点で必ず付く)。
  if (blob.type && !blob.type.startsWith('image/')) return blob;
  if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof URL === 'undefined') return blob;
  if (typeof URL.createObjectURL !== 'function') return blob;

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(blob);
    const img = await loadImage(objectUrl);
    const longSide = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
    if (longSide <= 0 || longSide <= maxDimension) return blob;

    const scale = maxDimension / longSide;
    const targetW = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const targetH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // 透過保持のため PNG。JPEG 元のときは JPEG (透過不要 + 軽い)。
    const outputType = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    const downscaled = await canvasToBlob(canvas, outputType, 0.85);
    if (!downscaled) return blob;
    return downscaled.size < blob.size ? downscaled : blob;
  } catch {
    return blob;
  } finally {
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
  }
}

// 画像 blob が壊れている / テスト環境で Image イベントが発火しない場合に備えて
// タイムアウト。3 秒以内に load/error が来なければ呼び出し側のフォールバックに任せる。
const LOAD_TIMEOUT_MS = 3000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      reject(new Error('image load timeout'));
    }, LOAD_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = (event) => {
      clearTimeout(timer);
      reject(event);
    };
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
