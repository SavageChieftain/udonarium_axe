/** A mulberry32 generator. The same seed always gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) % 4294967296 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
