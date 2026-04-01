import * as MessagePack from '@axe/core/util/message-pack';

describe('MessagePack', () => {
  describe('encode()', () => {
    it('オブジェクトをUint8Arrayにエンコードする', () => {
      const result = MessagePack.encode({ key: 'value' });
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('数値をエンコードする', () => {
      const result = MessagePack.encode(42);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('文字列をエンコードする', () => {
      const result = MessagePack.encode('hello');
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('配列をエンコードする', () => {
      const result = MessagePack.encode([1, 2, 3]);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('nullをエンコードする', () => {
      const result = MessagePack.encode(null);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('booleanをエンコードする', () => {
      const result = MessagePack.encode(true);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('ネストしたオブジェクトをエンコードする', () => {
      const result = MessagePack.encode({ a: { b: { c: 1 } } });
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('decode()', () => {
    it('エンコードされたオブジェクトをデコードする', () => {
      const original = { key: 'value', num: 42 };
      const encoded = MessagePack.encode(original);
      const decoded = MessagePack.decode(encoded);
      expect(decoded).toEqual(original);
    });

    it('エンコードされた数値をデコードする', () => {
      const encoded = MessagePack.encode(123);
      expect(MessagePack.decode(encoded)).toBe(123);
    });

    it('エンコードされた文字列をデコードする', () => {
      const encoded = MessagePack.encode('テスト');
      expect(MessagePack.decode(encoded)).toBe('テスト');
    });

    it('エンコードされた配列をデコードする', () => {
      const original = [1, 'two', true, null];
      const encoded = MessagePack.encode(original);
      expect(MessagePack.decode(encoded)).toEqual(original);
    });

    it('エンコードされたbooleanをデコードする', () => {
      expect(MessagePack.decode(MessagePack.encode(true))).toBe(true);
      expect(MessagePack.decode(MessagePack.encode(false))).toBe(false);
    });

    it('エンコードされたnullをデコードする', () => {
      expect(MessagePack.decode(MessagePack.encode(null))).toBeNull();
    });
  });

  describe('ラウンドトリップ', () => {
    it('複雑なオブジェクトをエンコード/デコードで復元する', () => {
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

    it('空オブジェクトのラウンドトリップ', () => {
      expect(MessagePack.decode(MessagePack.encode({}))).toEqual({});
    });

    it('空配列のラウンドトリップ', () => {
      expect(MessagePack.decode(MessagePack.encode([]))).toEqual([]);
    });

    it('大きな数値のラウンドトリップ', () => {
      expect(MessagePack.decode(MessagePack.encode(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('負の数のラウンドトリップ', () => {
      expect(MessagePack.decode(MessagePack.encode(-42))).toBe(-42);
    });

    it('浮動小数点のラウンドトリップ', () => {
      expect(MessagePack.decode(MessagePack.encode(3.14))).toBeCloseTo(3.14);
    });
  });

  describe('バイナリデータ', () => {
    it('Uint8Arrayをエンコード/デコードでバイナリとして復元する', () => {
      const original = new Uint8Array([0, 1, 2, 127, 128, 255]);
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(decoded).toEqual(original);
    });

    it('オブジェクト内のUint8Arrayフィールドが正しく復元される', () => {
      const blob = new Uint8Array([10, 20, 30]);
      const original = { identifier: 'img-1', type: 'image/png', blob };
      const decoded = MessagePack.decode(MessagePack.encode(original)) as typeof original;
      expect(decoded.identifier).toBe('img-1');
      expect(decoded.blob).toBeInstanceOf(Uint8Array);
      expect(decoded.blob).toEqual(blob);
    });

    it('ArrayBufferはバイナリとして復元されない（回帰テスト）', () => {
      // @msgpack/msgpack v3ではArrayBufferはプレーンオブジェクト扱いになる
      const buf = new Uint8Array([1, 2, 3]).buffer;
      const decoded = MessagePack.decode(MessagePack.encode(buf));
      // ArrayBufferはUint8Arrayとして復元されないことを確認
      expect(decoded).not.toBeInstanceOf(Uint8Array);
    });

    it('空のUint8Arrayのラウンドトリップ', () => {
      const original = new Uint8Array(0);
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect((decoded as Uint8Array).length).toBe(0);
    });

    it('大きなUint8Arrayのラウンドトリップ', () => {
      const original = new Uint8Array(1024);
      for (let i = 0; i < original.length; i++) original[i] = i % 256;
      const decoded = MessagePack.decode(MessagePack.encode(original));
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(decoded).toEqual(original);
    });

    it('配列内のUint8Arrayが正しく復元される', () => {
      const original = [{ blob: new Uint8Array([1, 2]) }, { blob: new Uint8Array([3, 4]) }];
      const decoded = MessagePack.decode(MessagePack.encode(original)) as typeof original;
      expect(decoded[0].blob).toBeInstanceOf(Uint8Array);
      expect(decoded[0].blob).toEqual(new Uint8Array([1, 2]));
      expect(decoded[1].blob).toEqual(new Uint8Array([3, 4]));
    });
  });
});
