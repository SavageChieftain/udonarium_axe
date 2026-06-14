import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { SurfaceDims } from '@axe/domain/tabletop/surface-space';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { beamTopGridGeometry, beamWallFaceGrid } from '@axe/features/tabletop/game-table/beam-top-grid';

const dims: SurfaceDims = { widthPx: 500, depthPx: 500, wallHeightPx: 500 };
const GRID = 50;

describe('beamTopGridGeometry', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((o) => store.delete(o, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((o) => store.delete(o, false));
    store.clearDeleteHistory();
  });

  it('北壁の梁の歩ける天面をワールド床座標の矩形として返す', () => {
    const beam = Terrain.create('beam', 2, 1, 4, '', '');
    beam.location.x = 100;
    beam.location.y = 0;
    beam.location.surface = 'north-wall';
    beam.isGrid = true;

    expect(beamTopGridGeometry(beam, dims, GRID)).toEqual({ left: 100, top: 0, width: 100, height: 200, z: 500 });
  });

  it('東壁の梁は室内(-x)側へ突き出した天面範囲を返す', () => {
    const beam = Terrain.create('beam', 2, 1, 3, '', '');
    beam.location.x = 0;
    beam.location.y = 0;
    beam.location.surface = 'east-wall';
    beam.isGrid = true;

    // east: origin(width,0) u(0,1,0) → footprint x[width-150, width] y[0, 100], 天面 z=500
    expect(beamTopGridGeometry(beam, dims, GRID)).toEqual({ left: 350, top: 0, width: 150, height: 100, z: 500 });
  });

  it('床地形は対象外 (null)', () => {
    const floor = Terrain.create('floor', 2, 2, 1, '', '');
    floor.isGrid = true;
    expect(beamTopGridGeometry(floor, dims, GRID)).toBeNull();
  });

  it('isGrid=false の壁地形は対象外 (null)', () => {
    const beam = Terrain.create('beam', 2, 1, 4, '', '');
    beam.location.surface = 'north-wall';
    beam.isGrid = false;
    expect(beamTopGridGeometry(beam, dims, GRID)).toBeNull();
  });
});

describe('beamWallFaceGrid', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((o) => store.delete(o, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((o) => store.delete(o, false));
    store.clearDeleteHistory();
  });

  function parseMatrix(face: { matrix3d: string }): number[] {
    return face.matrix3d.replace('matrix3d(', '').replace(')', '').split(',').map(Number);
  }

  it('北壁の梁の外側面を壁平面と正対する matrix3d で配置し N 接頭辞を付ける', () => {
    const beam = Terrain.create('beam', 2, 1, 4, '', '');
    beam.location.x = 100;
    beam.location.y = 0;
    beam.location.surface = 'north-wall';
    beam.isGrid = true;

    const face = beamWallFaceGrid(beam, dims, GRID)!;
    expect({ width: face.width, height: face.height, offsetLeft: face.offsetLeft, offsetTop: face.offsetTop }).toEqual({
      width: 100,
      height: 50,
      offsetLeft: 100,
      offsetTop: 0,
    });
    expect(face.prefix).toBe('N');
    const m = parseMatrix(face);
    // u=(1,0,0) v=(0,0,-1) normal=(0,1,0)
    expect(m.slice(0, 3)).toEqual([1, 0, 0]);
    expect(m.slice(4, 7)).toEqual([0, 0, -1]);
    expect(m.slice(8, 11)).toEqual([0, 1, 0]);
    // P0 = origin(0,0,500) + u*100 + normal*(height*50 + small lift) → (100, ~200+, 500)
    expect(m[12]).toBeCloseTo(100);
    expect(m[13]).toBeGreaterThan(200);
    expect(m[13]).toBeLessThan(220);
    expect(m[14]).toBeCloseTo(500);
  });

  it('protrusion に altitude と posZ を含める (天面側と同じ法線オフセット)', () => {
    const beam = Terrain.create('beam', 2, 1, 4, '', '');
    beam.location.x = 100;
    beam.location.y = 0;
    beam.location.surface = 'north-wall';
    beam.altitude = 2;
    beam.posZ = 25;
    beam.isGrid = true;

    const m = parseMatrix(beamWallFaceGrid(beam, dims, GRID)!);
    // normal(+y) * ((altitude+height)*50 + posZ + lift) = (2+4)*50 + 25 = 325(+lift)
    expect(m[13]).toBeGreaterThan(325);
    expect(m[13]).toBeLessThan(345);
  });

  it('東壁の梁は室内(-x)へ突き出し E 接頭辞・原点 x=width-protrusion になる', () => {
    const beam = Terrain.create('beam', 2, 1, 3, '', '');
    beam.location.x = 0;
    beam.location.y = 0;
    beam.location.surface = 'east-wall';
    beam.isGrid = true;

    const face = beamWallFaceGrid(beam, dims, GRID)!;
    expect(face.prefix).toBe('E');
    const m = parseMatrix(face);
    // east: u(0,1,0) v(0,0,-1) normal(-1,0,0); protrusion 150(+lift) → P0=(349.7,0,500)
    expect(m.slice(0, 3)).toEqual([0, 1, 0]);
    expect(m.slice(8, 11)).toEqual([-1, 0, 0]);
    // normal(-x): P0.x = width(500) - ((height*50)+lift) → just under 350
    expect(m[12]).toBeGreaterThan(330);
    expect(m[12]).toBeLessThan(350);
    expect(m[13]).toBeCloseTo(0);
    expect(m[14]).toBeCloseTo(500);
  });

  it('床地形・isGrid=false は対象外 (null)', () => {
    const floor = Terrain.create('floor', 2, 2, 1, '', '');
    floor.isGrid = true;
    expect(beamWallFaceGrid(floor, dims, GRID)).toBeNull();

    const beam = Terrain.create('beam', 2, 1, 4, '', '');
    beam.location.surface = 'north-wall';
    beam.isGrid = false;
    expect(beamWallFaceGrid(beam, dims, GRID)).toBeNull();
  });
});
