import { targetArrowGeometry } from '@axe/domain/card/target-arrow';

describe('targetArrowGeometry()', () => {
  it('始点・長さ・角度を返すこと', () => {
    const geometry = targetArrowGeometry({ x: 100, y: 100, z: 0 }, { x: 400, y: 500, z: 0 });

    expect(geometry).toEqual({ x: 100, y: 100, z: 0, length: 500, angle: expect.closeTo(53.13, 2) });
  });

  it('真横のときは角度 0 になること', () => {
    expect(targetArrowGeometry({ x: 0, y: 0, z: 0 }, { x: 200, y: 0, z: 0 })?.angle).toBe(0);
  });

  it('高い方の高さに合わせること', () => {
    expect(targetArrowGeometry({ x: 0, y: 0, z: 10 }, { x: 200, y: 0, z: 60 })?.z).toBe(60);
  });

  it('重なるほど近ければ描かないこと', () => {
    expect(targetArrowGeometry({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 0 })).toBeNull();
  });
});
