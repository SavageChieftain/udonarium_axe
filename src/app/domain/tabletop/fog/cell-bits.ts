const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < BASE64_ALPHABET.length; i++) table[BASE64_ALPHABET.charCodeAt(i)] = i;
  return table;
})();

export class CellBits {
  private readonly words: Uint8Array;

  constructor(readonly count: number) {
    this.words = new Uint8Array(Math.max(0, Math.ceil(count / 8)));
  }

  get(index: number): boolean {
    if (index < 0 || index >= this.count) return false;
    return (this.words[index >> 3] & (1 << (index & 7))) !== 0;
  }

  set(index: number): void {
    if (index < 0 || index >= this.count) return;
    this.words[index >> 3] |= 1 << (index & 7);
  }

  unset(index: number): void {
    if (index < 0 || index >= this.count) return;
    this.words[index >> 3] &= ~(1 << (index & 7));
  }

  clear(): void {
    this.words.fill(0);
  }

  get isEmpty(): boolean {
    return this.words.every((word) => word === 0);
  }

  or(other: CellBits): boolean {
    let changed = false;
    const limit = Math.min(this.words.length, other.words.length);
    for (let i = 0; i < limit; i++) {
      const merged = this.words[i] | other.words[i];
      if (merged === this.words[i]) continue;
      this.words[i] = merged;
      changed = true;
    }
    return changed;
  }

  covers(other: CellBits): boolean {
    for (let i = 0; i < other.words.length; i++) {
      const mine = this.words[i] ?? 0;
      if ((mine | other.words[i]) !== mine) return false;
    }
    return true;
  }

  equals(other: CellBits): boolean {
    if (this.count !== other.count) return false;
    return this.words.every((word, i) => word === other.words[i]);
  }

  copy(): CellBits {
    const clone = new CellBits(this.count);
    clone.words.set(this.words);
    return clone;
  }

  bytes(): Uint8Array {
    return this.words;
  }
}

export function encodeCellBits(bits: CellBits): string {
  const bytes = bits.bytes();
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += BASE64_ALPHABET[a >> 2];
    out += BASE64_ALPHABET[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? BASE64_ALPHABET[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? BASE64_ALPHABET[c & 63] : '=';
  }
  return out;
}

export function decodeCellBits(text: string, count: number): CellBits {
  const bits = new CellBits(count);
  const bytes = bits.bytes();
  let byteAt = 0;
  let held = 0;
  let heldBits = 0;
  for (let i = 0; i < text.length && byteAt < bytes.length; i++) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? BASE64_LOOKUP[code] : -1;
    if (value < 0) continue;
    held = (held << 6) | value;
    heldBits += 6;
    if (heldBits < 8) continue;
    heldBits -= 8;
    bytes[byteAt++] = (held >> heldBits) & 0xff;
  }
  return bits;
}
