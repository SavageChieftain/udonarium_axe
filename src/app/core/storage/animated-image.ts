import { isAnimatedPng } from '@axe/core/storage/image-downscale';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

function startsWith(view: DataView, bytes: number[], offset = 0): boolean {
  if (view.byteLength < offset + bytes.length) return false;
  return bytes.every((byte, index) => view.getUint8(offset + index) === byte);
}

function ascii(view: DataView, offset: number, length: number): string {
  if (view.byteLength < offset + length) return '';
  let text = '';
  for (let index = 0; index < length; index += 1) text += String.fromCharCode(view.getUint8(offset + index));
  return text;
}

/**
 * Whether a picture moves.
 *
 * Only the head of the file is read, which is where each format says so: png carries an
 * acTL chunk before its first pixels, webp an ANIM chunk in the same place. A gif is taken
 * at its word without counting frames - one that turns out to hold a single frame is drawn
 * exactly as it would have been anyway.
 */
export function isAnimatedImageBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const view = new DataView(buffer);

  if (startsWith(view, PNG_SIGNATURE)) return isAnimatedPng(buffer);
  if (ascii(view, 0, 3) === 'GIF') return true;
  if (ascii(view, 0, 4) === 'RIFF' && ascii(view, 8, 4) === 'WEBP') return hasWebPAnimation(view);
  return false;
}

function hasWebPAnimation(view: DataView): boolean {
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const fourCC = ascii(view, offset, 4);
    if (fourCC === 'ANIM' || fourCC === 'ANMF') return true;
    const size = view.getUint32(offset + 4, true);
    if (!Number.isFinite(size)) return false;
    offset += 8 + size + (size % 2);
  }
  return false;
}
