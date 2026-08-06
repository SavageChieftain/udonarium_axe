import {
  makeBillboardTransform,
  makeLabelOrbitTransform,
  makeScreenLiftTransform,
} from '@axe/ui/tabletop/billboard-transform';

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

describe('makeScreenLiftTransform', () => {
  const axisOf = (transform: string, axis: 'X' | 'Y' | 'Z') =>
    Number(new RegExp(`translate${axis}\\((-?[\\d.]+)px\\)`).exec(transform)![1]);

  const worldOffsetOf = (transform: string, tilt: number, yaw: number, roll: number) => {
    const local = {
      x: axisOf(transform, 'X'),
      y: axisOf(transform, 'Y'),
      z: axisOf(transform, 'Z'),
    };
    const rollRad = (roll * Math.PI) / 180;
    const rolled = {
      x: local.x * Math.cos(rollRad) - local.y * Math.sin(rollRad),
      y: local.x * Math.sin(rollRad) + local.y * Math.cos(rollRad),
      z: local.z,
    };
    const table = { x: rolled.x, y: rolled.z, z: -rolled.y };
    const yawRad = (yaw * Math.PI) / 180;
    const yawed = {
      x: table.x * Math.cos(yawRad) - table.y * Math.sin(yawRad),
      y: table.x * Math.sin(yawRad) + table.y * Math.cos(yawRad),
      z: table.z,
    };
    const tiltRad = (tilt * Math.PI) / 180;
    return {
      x: yawed.x,
      y: yawed.y * Math.cos(tiltRad) - yawed.z * Math.sin(tiltRad),
      z: yawed.y * Math.sin(tiltRad) + yawed.z * Math.cos(tiltRad),
    };
  };

  it.each([
    { tilt: 50, tableYaw: 10, pieceRotate: 0, pieceRoll: 0 },
    { tilt: 35, tableYaw: 40, pieceRotate: 0, pieceRoll: 0 },
    { tilt: 70, tableYaw: -25, pieceRotate: 90, pieceRoll: 0 },
    { tilt: 50, tableYaw: 10, pieceRotate: 45, pieceRoll: 30 },
  ])('カメラ・コマの向きに関わらず画面の真上にだけ動かすこと %o', ({ tilt, tableYaw, pieceRotate, pieceRoll }) => {
    const out = makeScreenLiftTransform({
      rotation: { x: tilt, y: 0, z: tableYaw },
      pieceRotate,
      pieceRoll,
      worldHeight3d: 80,
      screenLift3d: 52,
      distance2d: 120,
      mode2d: false,
    });
    const world = worldOffsetOf(out, tilt, tableYaw + pieceRotate, pieceRoll);

    expect(world.x).toBeCloseTo(0, 1);
    expect(world.z).toBeCloseTo(0, 1);
    expect(world.y).toBeCloseTo(-(80 * Math.sin((tilt * Math.PI) / 180) + 52), 1);
  });

  it('2D モードではテーブル面上の距離で置くこと', () => {
    const out = makeScreenLiftTransform({
      rotation: { x: 0, y: 0, z: 0 },
      pieceRotate: 0,
      pieceRoll: 0,
      worldHeight3d: 80,
      screenLift3d: 52,
      distance2d: 120,
      mode2d: true,
    });

    expect(out).toContain('translateZ(-120.00px)');
    expect(out).not.toContain('translateY');
  });

  it('rotation が null ならデフォルト (x=50, z=10) で計算する', () => {
    const out = makeScreenLiftTransform({
      rotation: null,
      pieceRotate: 0,
      pieceRoll: 0,
      worldHeight3d: 0,
      screenLift3d: 100,
      distance2d: 120,
      mode2d: false,
    });
    const world = worldOffsetOf(out, 50, 10, 0);

    expect(world.x).toBeCloseTo(0, 1);
    expect(world.z).toBeCloseTo(0, 1);
    expect(world.y).toBeCloseTo(-100, 1);
  });
});
