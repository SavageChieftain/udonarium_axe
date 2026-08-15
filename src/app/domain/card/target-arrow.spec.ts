import { targetArrowGeometry } from '@axe/domain/card/target-arrow';

describe('targetArrowGeometry()', () => {
  it('returns where it starts, how long it is and which way it runs', () => {
    const geometry = targetArrowGeometry({ x: 100, y: 100, z: 0 }, { x: 400, y: 500, z: 0 });

    expect(geometry).toEqual({ x: 100, y: 100, z: 0, length: 500, angle: expect.closeTo(53.13, 2) });
  });

  it('runs level when it goes straight across', () => {
    expect(targetArrowGeometry({ x: 0, y: 0, z: 0 }, { x: 200, y: 0, z: 0 })?.angle).toBe(0);
  });

  it('takes the greater of the two heights', () => {
    expect(targetArrowGeometry({ x: 0, y: 0, z: 10 }, { x: 200, y: 0, z: 60 })?.z).toBe(60);
  });

  it('draws nothing when the two all but touch', () => {
    expect(targetArrowGeometry({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 0 })).toBeNull();
  });
});
