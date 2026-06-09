import { surfaceInwardDirection, surfacePointTo3D } from '@axe/domain/tabletop/surface-space';

const dims = { widthPx: 1000, depthPx: 800, wallHeightPx: 300 };

describe('surface-space', () => {
  it('floor はローカル座標がそのまま、heightAbove が z になる', () => {
    expect(surfacePointTo3D('floor', 100, 200, dims, 50)).toEqual({ x: 100, y: 200, z: 50 });
  });

  it('north-wall はローカル(x,y)を (x, 0, wallHeight-y) に写す', () => {
    expect(surfacePointTo3D('north-wall', 120, 80, dims)).toEqual({ x: 120, y: 0, z: 300 - 80 });
  });

  it('south-wall は x をミラーし y=depth に写す', () => {
    expect(surfacePointTo3D('south-wall', 120, 80, dims)).toEqual({ x: 1000 - 120, y: 800, z: 300 - 80 });
  });

  it('west-wall はローカルx を table y に、x=0 に写す', () => {
    expect(surfacePointTo3D('west-wall', 120, 80, dims)).toEqual({ x: 0, y: 120, z: 300 - 80 });
  });

  it('east-wall はミラーし x=width に写す', () => {
    expect(surfacePointTo3D('east-wall', 120, 80, dims)).toEqual({ x: 1000, y: 800 - 120, z: 300 - 80 });
  });

  it('heightAbove は法線方向(部屋側)へ押し出す', () => {
    expect(surfacePointTo3D('north-wall', 0, 0, dims, 10)).toEqual({ x: 0, y: 10, z: 300 });
  });

  it('壁の内向き方向は部屋側を指す', () => {
    expect(surfaceInwardDirection('north-wall')).toBeCloseTo(90);
    expect(surfaceInwardDirection('south-wall')).toBeCloseTo(-90);
    expect(surfaceInwardDirection('west-wall')).toBeCloseTo(0);
    expect(surfaceInwardDirection('east-wall')).toBeCloseTo(180);
  });
});
