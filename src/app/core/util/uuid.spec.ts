import { generateUuid } from '@axe/core/util/uuid';

describe('generateUuid()', () => {
  it('returns a string', () => {
    const uuid = generateUuid();
    expect(uuid).toBeTruthy();
    expect(typeof uuid).toBe('string');
  });

  it('matches the shape of a version four uuid', () => {
    const uuid = generateUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('is thirty-six characters long', () => {
    expect(generateUuid().length).toBe(36);
  });

  it('generates a value of its own', () => {
    const uuid1 = generateUuid();
    const uuid2 = generateUuid();
    const uuid3 = generateUuid();
    expect(uuid1).not.toBe(uuid2);
    expect(uuid2).not.toBe(uuid3);
    expect(uuid1).not.toBe(uuid3);
  });

  it('generates no duplicates in bulk', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      uuids.add(generateUuid());
    }
    expect(uuids.size).toBe(1000);
  });

  it('uses lowercase hexadecimal only', () => {
    expect(generateUuid()).toMatch(/^[0-9a-f-]+$/);
  });

  it('gets the segment lengths right', () => {
    const segments = generateUuid().split('-');
    expect(segments).toHaveLength(5);
    expect(segments[0].length).toBe(8);
    expect(segments[1].length).toBe(4);
    expect(segments[2].length).toBe(4);
    expect(segments[3].length).toBe(4);
    expect(segments[4].length).toBe(12);
  });
});
