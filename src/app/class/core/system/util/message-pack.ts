import { encode as msgpackEncode, decode as msgpackDecode } from '@msgpack/msgpack';

export function encode(object: unknown): Uint8Array {
  try {
    return msgpackEncode(object);
  } catch (error) {
    console.error(error, object);
  }
  return null!;
}

export function decode(buffer: Uint8Array): unknown {
  try {
    return msgpackDecode(buffer);
  } catch (error) {
    console.error(error, buffer);
  }
  return null!;
}
