import type { Attributes } from './attributes';

describe('Attributes', () => {
  it('type定義に準拠するオブジェクトを作成できる', () => {
    const attrs: Attributes = { name: 'test', value: 42 };
    expect(attrs.name).toBe('test');
    expect(attrs.value).toBe(42);
  });
});
