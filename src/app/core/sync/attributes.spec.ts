import type { Attributes } from '@axe/core/sync/attributes';

describe('Attributes', () => {
  it('builds an object matching the type', () => {
    const attrs: Attributes = { name: 'test', value: 42 };
    expect(attrs.name).toBe('test');
    expect(attrs.value).toBe(42);
  });
});
