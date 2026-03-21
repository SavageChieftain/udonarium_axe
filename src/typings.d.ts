declare module 'lzbase62' {
  export function compress(str: string): string;
  export function decompress(str: string): string;
}

declare module 'crypto-js/lib-typedarrays' {
  class WordArray {
    words: number[];
    sigBytes: number;
    static create(arg: ArrayBuffer): WordArray;
  }
  export default WordArray;
}

declare module 'crypto-js/sha256' {
  import WordArray from 'crypto-js/lib-typedarrays';
  function SHA256(data: string | WordArray): WordArray;
  export default SHA256;
}
