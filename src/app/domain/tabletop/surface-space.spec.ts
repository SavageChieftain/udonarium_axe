import { surfaceInwardDirection, surfacePointTo3D, surfaceWorldBox } from '@axe/domain/tabletop/surface-space';

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

  it('west-wall は実描画に一致: 原点(0,depth) から u=-y、x=0 平面', () => {
    expect(surfacePointTo3D('west-wall', 120, 80, dims)).toEqual({ x: 0, y: 800 - 120, z: 300 - 80 });
  });

  it('east-wall は実描画に一致: 原点(width,0) から u=+y、x=width 平面', () => {
    expect(surfacePointTo3D('east-wall', 120, 80, dims)).toEqual({ x: 1000, y: 120, z: 300 - 80 });
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

  describe('surfaceWorldBox', () => {
    it('floor の箱はローカル矩形と法線方向の厚みをそのまま使う', () => {
      // footprint (10,20)-(60,70), 法線(=z)方向 base 100 から厚み 50
      expect(surfaceWorldBox('floor', 10, 20, 50, 50, 100, 50, dims)).toEqual({
        minX: 10,
        maxX: 60,
        minY: 20,
        maxY: 70,
        minZ: 100,
        maxZ: 150,
      });
    });

    it('north-wall の梁: 壁面の矩形が室内(+y)へ厚み分突き出し、天面 z=wallHeight-localY', () => {
      // localX[100,200] localY[0,50], 法線(室内+y)へ base0..厚み200
      expect(surfaceWorldBox('north-wall', 100, 0, 100, 50, 0, 200, dims)).toEqual({
        minX: 100,
        maxX: 200,
        minY: 0,
        maxY: 200,
        minZ: 300 - 50,
        maxZ: 300,
      });
    });

    it('east-wall の梁: 室内(-x)へ突き出し x=width から内側へ', () => {
      // east(実描画一致): origin(width,0) u(0,1,0) v(0,0,-1) normal(-1,0,0)
      // localX[0,100] localY[0,50] base0 厚み150
      expect(surfaceWorldBox('east-wall', 0, 0, 100, 50, 0, 150, dims)).toEqual({
        minX: 1000 - 150,
        maxX: 1000,
        minY: 0,
        maxY: 100,
        minZ: 300 - 50,
        maxZ: 300,
      });
    });
  });
});
