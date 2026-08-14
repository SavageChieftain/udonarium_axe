import * as MessagePack from '@axe/core/util/message-pack';

describe('MessagePack', () => {
  describe('encode()', () => {
    it('encodes an object into bytes', () => {
      const result = MessagePack.encode({ key: 'value' });
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('encodes a number', () => {
      const result = MessagePack.encode(42);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('encodes a string', () => {
      const result = MessagePack.encode('hello');
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('encodes an array', () => {
      const result = MessagePack.encode([1, 2, 3]);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('encodes null', () => {
      const result = MessagePack.encode(null);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('encodes a boolean', () => {
      const result = MessagePack.encode(true);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('encodes a nested object', () => {
      const result = MessagePack.encode({ a: { b: { c: 1 } } });
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('decode()', () => {
    it('decodes an object', () => {
      const original = { key: 'value', num: 42 };
      const encoded = MessagePack.encode(original);
      const decoded = MessagePack.decode(encoded);
      expect(decoded).toEqual(original);
    });

    it('decodes a number', () => {
      const encoded = MessagePack.encode(123);
      expect(MessagePack.decode(encoded)).toBe(123);
    });

    it('decodes a string', () => {
      const encoded = MessagePack.encode('テスト');
      expect(MessagePack.decode(encoded)).toBe('テスト');
    });

    it('decodes an array', () => {
      const original = [1, 'two', true, null];
      const encoded = MessagePack.encode(original);
      expect(MessagePack.decode(encoded)).toEqual(original);
    });

    it('decodes a boolean', () => {
      expect(MessagePack.decode(MessagePack.encode(true))).toBe(true);
      expect(MessagePack.decode(MessagePack.encode(false))).toBe(false);
    });

    it('decodes null', () => {
      expect(MessagePack.decode(MessagePack.encode(null))).toBeNull();
    });
  });

  describe('the round trip', () => {
    it('carries a complicated object through unchanged', () => {
      const original = {
        name: 'テスト',
        level: 5,
        items: ['sword', 'shield'],
        nested: { hp: 100, mp: 50 },
        active: true,
        nothing: null,
      };
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toEqual(original);
    });

    it('an empty object survives the round trip', () => {
      expect(MessagePack.decode(MessagePack.encode({}))).toEqual({});
    });

    it('an empty array survives the round trip', () => {
      expect(MessagePack.decode(MessagePack.encode([]))).toEqual([]);
    });

    it('a large number survives the round trip', () => {
      expect(MessagePack.decode(MessagePack.encode(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('a negative number survives the round trip', () => {
      expect(MessagePack.decode(MessagePack.encode(-42))).toBe(-42);
    });

    it('a fractional number survives the round trip', () => {
      expect(MessagePack.decode(MessagePack.encode(3.14))).toBeCloseTo(3.14);
    });
  });

  describe('binary data', () => {
    it('carries bytes through as bytes', () => {
      const original = new Uint8Array([0, 1, 2, 127, 128, 255]);
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(decoded).toEqual(original);
    });

    it('carries bytes inside an object through as bytes', () => {
      const blob = new Uint8Array([10, 20, 30]);
      const original = { identifier: 'img-1', type: 'image/png', blob };
      const decoded = MessagePack.decode(MessagePack.encode(original)) as typeof original;
      expect(decoded.identifier).toBe('img-1');
      expect(decoded.blob).toBeInstanceOf(Uint8Array);
      expect(decoded.blob).toEqual(blob);
    });

    it('a raw buffer does not come back as bytes', () => {
      // the encoder treats a raw buffer as a plain object
      const buf = new Uint8Array([1, 2, 3]).buffer;
      const decoded = MessagePack.decode(MessagePack.encode(buf));
      // confirm a raw buffer does not return as bytes
      expect(decoded).not.toBeInstanceOf(Uint8Array);
    });

    it('empty bytes survive the round trip', () => {
      const original = new Uint8Array(0);
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect((decoded as Uint8Array).length).toBe(0);
    });

    it('a large run of bytes survives the round trip', () => {
      const original = new Uint8Array(1024);
      for (let i = 0; i < original.length; i++) original[i] = i % 256;
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(decoded).toEqual(original);
    });

    it('carries bytes inside an array through as bytes', () => {
      const original = [{ blob: new Uint8Array([1, 2]) }, { blob: new Uint8Array([3, 4]) }];
      const decoded = MessagePack.decode(MessagePack.encode(original)) as typeof original;
      expect(decoded[0].blob).toBeInstanceOf(Uint8Array);
      expect(decoded[0].blob).toEqual(new Uint8Array([1, 2]));
      expect(decoded[1].blob).toEqual(new Uint8Array([3, 4]));
    });
  });
});
