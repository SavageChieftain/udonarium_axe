/**
 * ID3v2 APIC frame extractor.
 * Supports ID3v2.2 (PIC), ID3v2.3 (APIC), and ID3v2.4 (APIC, syncsafe sizes).
 * Returns an ObjectURL string for the embedded artwork, or null if not found.
 */
export function extractArtworkUrl(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  // Must start with "ID3"
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;

  const majorVersion = bytes[3]; // 2, 3, or 4
  const headerFlags = bytes[5];

  // Tag size is a 4-byte syncsafe integer (bits 7 of each byte are ignored)
  const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);

  let offset = 10;
  const tagEnd = Math.min(10 + tagSize, buffer.byteLength);

  // Skip extended header if present
  if (headerFlags & 0x40) {
    if (majorVersion === 4) {
      const extSize =
        ((bytes[offset] & 0x7f) << 21) |
        ((bytes[offset + 1] & 0x7f) << 14) |
        ((bytes[offset + 2] & 0x7f) << 7) |
        (bytes[offset + 3] & 0x7f);
      offset += extSize;
    } else {
      // v2.3: plain 4-byte big-endian size (includes the 4 size bytes)
      const extSize = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 4 + extSize;
    }
  }

  while (offset < tagEnd) {
    let frameId: string;
    let frameSize: number;
    let frameHeaderSize: number;

    if (majorVersion === 2) {
      // ID3v2.2: 3-byte ID + 3-byte size
      if (offset + 6 > tagEnd) break;
      frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
      frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
      frameHeaderSize = 6;
    } else {
      // ID3v2.3 / v2.4: 4-byte ID + 4-byte size
      if (offset + 10 > tagEnd) break;
      frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      if (majorVersion === 4) {
        // Syncsafe integer
        frameSize =
          ((bytes[offset + 4] & 0x7f) << 21) |
          ((bytes[offset + 5] & 0x7f) << 14) |
          ((bytes[offset + 6] & 0x7f) << 7) |
          (bytes[offset + 7] & 0x7f);
      } else {
        frameSize =
          (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
      }
      frameHeaderSize = 10;
    }

    if (frameSize <= 0) break;

    const dataStart = offset + frameHeaderSize;
    const dataEnd = dataStart + frameSize;

    if (dataEnd > tagEnd) break;

    const apicId = majorVersion === 2 ? 'PIC' : 'APIC';
    if (frameId === apicId) {
      const url = parseApicFrame(bytes, dataStart, dataEnd, majorVersion);
      if (url) return url;
    }

    offset = dataEnd;
  }

  return null;
}

function parseApicFrame(bytes: Uint8Array, start: number, end: number, version: number): string | null {
  if (start >= end) return null;

  const enc = bytes[start]; // 0=Latin-1, 1=UTF-16, 2=UTF-16BE, 3=UTF-8
  let i = start + 1;

  let mimeType: string;

  if (version === 2) {
    // v2.2 PIC: 3-byte image format ("JPG", "PNG", etc.)
    if (i + 3 > end) return null;
    const fmt = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2]).toUpperCase();
    mimeType = fmt === 'PNG' ? 'image/png' : 'image/jpeg';
    i += 3;
  } else {
    // v2.3 / v2.4 APIC: null-terminated MIME string (always ASCII/Latin-1)
    const mimeStart = i;
    while (i < end && bytes[i] !== 0) i++;
    mimeType = String.fromCharCode(...bytes.slice(mimeStart, i));
    i++; // skip null terminator
  }

  if (i >= end) return null;
  i++; // skip picture type byte

  // Skip description (null-terminated; UTF-16 uses 2-byte null)
  if (enc === 1 || enc === 2) {
    while (i + 1 < end && !(bytes[i] === 0 && bytes[i + 1] === 0)) i += 2;
    i += 2;
  } else {
    while (i < end && bytes[i] !== 0) i++;
    i++;
  }

  if (i >= end) return null;

  const imageBytes = bytes.slice(i, end);
  if (!imageBytes.length) return null;

  const resolvedMime = normalizeMime(mimeType, imageBytes);
  const blob = new Blob([imageBytes], { type: resolvedMime });
  return URL.createObjectURL(blob);
}

function normalizeMime(mime: string, bytes: Uint8Array): string {
  // Detect by magic bytes if MIME is missing/wrong
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp';
  const m = mime.toLowerCase();
  if (m.includes('png')) return 'image/png';
  if (m.includes('gif')) return 'image/gif';
  if (m.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}
