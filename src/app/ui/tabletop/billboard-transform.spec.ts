import { makeBillboardTransform, makeLabelOrbitTransform } from '@axe/ui/tabletop/billboard-transform';

describe('makeBillboardTransform', () => {
  it('3Dモードでカメラチルト分の compensateZ を含む', () => {
    const out = makeBillboardTransform({
      rotation: { x: 50, y: 0, z: 10 },
      pieceRotate: 0,
      parentInverseRotation: 'rotateX(90deg)',
      verticalOffset3D: 30,
      mode2d: false,
    });
    expect(out).toMatch(/^translateZ\((-?\d+\.\d{2})px\) /);
    expect(out).not.toContain('translateZ(0.00px)');
  });

  it('2Dモードでは compensateZ が 0 になる', () => {
    const out = makeBillboardTransform({
      rotation: { x: 50, y: 0, z: 10 },
      pieceRotate: 0,
      parentInverseRotation: 'rotateX(90deg)',
      verticalOffset3D: 30,
      mode2d: true,
    });
    expect(out).toContain('translateZ(0.00px)');
  });

  it('pieceRoll が未指定なら rotateZ(roll) を含まない', () => {
    const out = makeBillboardTransform({
      rotation: { x: 50, y: 0, z: 10 },
      pieceRotate: 45,
      parentInverseRotation: 'rotateX(90deg)',
      verticalOffset3D: 30,
      mode2d: false,
    });
    expect(out).toContain('rotateZ(-45deg)');
    expect(out.match(/rotateZ\(-\d+deg\)/g)?.length).toBe(2);
  });

  it('pieceRoll を指定すると roll 用 rotateZ が先頭近くに入る', () => {
    const out = makeBillboardTransform({
      rotation: { x: 50, y: 0, z: 10 },
      pieceRotate: 0,
      pieceRoll: 20,
      parentInverseRotation: 'rotateY(90deg) rotateZ(90deg) rotateY(-90deg)',
      verticalOffset3D: 30,
      mode2d: false,
    });
    expect(out).toContain('rotateZ(-20deg)');
    expect(out).toContain('rotateY(90deg) rotateZ(90deg) rotateY(-90deg)');
  });

  it('rotation が null ならデフォルト (x=50, y=0, z=10) で計算する', () => {
    const out = makeBillboardTransform({
      rotation: null,
      pieceRotate: 0,
      parentInverseRotation: 'rotateX(90deg)',
      verticalOffset3D: 30,
      mode2d: false,
    });
    expect(out).toContain('rotateZ(-10deg)');
    expect(out).toContain('rotateX(-50deg)');
    expect(out).toContain('rotateY(0deg)');
  });
});

describe('makeLabelOrbitTransform', () => {
  it('3D モードでは translateY(-distance3d) を返す', () => {
    const out = makeLabelOrbitTransform({
      rotation: { x: 50, y: 0, z: 10 },
      distance3d: 30,
      distance2d: 60,
      mode2d: false,
    });
    expect(out).toBe('translateY(-30px)');
  });

  it('2D モードでヨー=0 なら translateZ(-distance2d) になる', () => {
    const out = makeLabelOrbitTransform({
      rotation: { x: 0, y: 0, z: 0 },
      distance3d: 30,
      distance2d: 60,
      mode2d: true,
    });
    expect(out).toContain('translateZ(-60.00px)');
    const x = Number(out.match(/translateX\((-?[\d.]+)px\)/)?.[1] ?? NaN);
    expect(x).toBeCloseTo(0, 5);
  });

  it('2D モードでヨー=90 度なら translateX(-distance2d) になる', () => {
    const out = makeLabelOrbitTransform({
      rotation: { x: 0, y: 0, z: 90 },
      distance3d: 30,
      distance2d: 60,
      mode2d: true,
    });
    expect(out).toContain('translateX(-60.00px)');
    const z = Number(out.match(/translateZ\((-?[\d.]+)px\)/)?.[1] ?? NaN);
    expect(z).toBeCloseTo(0, 5);
  });
});
