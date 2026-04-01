import { decode as msgpackDecode, encode as msgpackEncode } from '@msgpack/msgpack';

export function encode(object: unknown): Uint8Array {
  return msgpackEncode(object);
}

export function decode(buffer: Uint8Array): unknown {
  return msgpackDecode(buffer);
}
