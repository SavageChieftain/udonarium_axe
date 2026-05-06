import { sha256Hex } from '@axe/core/util/crypto-util';

export function readAsArrayBufferAsync(blob: Blob): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onabort = reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsArrayBuffer(blob);
  });
}

export function readAsTextAsync(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onabort = reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsText(blob);
  });
}

export function readAsDataURLAsync(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onabort = reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsDataURL(blob);
  });
}

export async function calcSHA256Async(arrayBuffer: ArrayBuffer): Promise<string>;
export async function calcSHA256Async(blob: Blob): Promise<string>;
export async function calcSHA256Async(arg: ArrayBuffer | Blob): Promise<string> {
  if (arg instanceof Blob) {
    arg = await readAsArrayBufferAsync(arg);
  }
  return sha256Hex(arg);
}
