export interface DownscaleOptions {
  /**
   * true のとき中心を基準に正方形クロップしてから maxDimension にリサンプルする。
   * 立ち絵のサムネイル化など、サイズが揃ってほしい用途に。
   */
  square?: boolean;
}

/**
 * Blob 画像を最大辺 maxDimension まで canvas でリサンプルしたうえで Blob に書き戻す。
 *
 * - 元画像が maxDimension 以下 (かつ square 不要) なら何もせず元 Blob を返す。
 * - ブラウザ以外 (Node / happy-dom 等) や canvas 未対応環境では何もせず元 Blob を返す。
 * - 縮小結果が元より大きくなった場合 (低解像度元画像など) も元 Blob を返す。
 * - square: true なら中心基準の正方形クロップを行ったうえでリサンプル。出力は常に maxDimension × maxDimension。
 */
export async function downscaleImageBlob(
  blob: Blob | null | undefined,
  maxDimension: number,
  options: DownscaleOptions = {}
): Promise<Blob | null> {
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
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (naturalW <= 0 || naturalH <= 0) return blob;

    const square = options.square === true;
    let sx = 0;
    let sy = 0;
    let sw = naturalW;
    let sh = naturalH;
    let targetW: number;
    let targetH: number;

    if (square) {
      // 短辺基準で中央クロップ
      const side = Math.min(naturalW, naturalH);
      sx = Math.floor((naturalW - side) / 2);
      sy = Math.floor((naturalH - side) / 2);
      sw = side;
      sh = side;
      targetW = targetH = Math.min(side, maxDimension);
    } else {
      const longSide = Math.max(naturalW, naturalH);
      if (longSide <= maxDimension) return blob;
      const scale = maxDimension / longSide;
      targetW = Math.max(1, Math.round(naturalW * scale));
      targetH = Math.max(1, Math.round(naturalH * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

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
