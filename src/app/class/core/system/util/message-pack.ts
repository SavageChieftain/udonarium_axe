import { Logger } from '@axe/core/logger';
import { encode as msgpackEncode, decode as msgpackDecode } from '@msgpack/msgpack';

export function encode(object: unknown): Uint8Array {
  try {
    return msgpackEncode(object);
  } catch (error) {
    Logger.error('[MessagePack] エンコードエラー', error);
  }
  return null!;
}

export function decode(buffer: Uint8Array): unknown {
  try {
    return msgpackDecode(buffer);
  } catch (error) {
    Logger.error('[MessagePack] デコードエラー', error);
  }
  return null!;
}
