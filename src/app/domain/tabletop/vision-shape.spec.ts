import {
  applyVisionShape,
  asVisionShape,
  FACING_BEARING_OFFSET,
  facingBearing,
  formatVisionLobes,
  maxLobeScale,
  MutableVisionFields,
  parseVisionLobes,
  VISION_SHAPE_DEFAULTS,
  visionLobeScale,
  visionLobesOf,
  VisionShape,
  VisionSpec,
} from '@axe/domain/tabletop/vision-shape';
import { describe, expect, it } from 'vitest';

function spec(partial: Partial<VisionSpec> = {}): VisionSpec {
  return {
    shape: VisionShape.DOME,
    coneAngle: 120,
    coneCount: 3,
    backAngle: 90,
    backScale: 0.4,
    peripheralScale: 0.3,
    direction: 0,
    lobes: '',
    ...partial,
  };
}

describe('visionLobesOf', () => {
  it('gives one lobe all the way round for a dome', () => {
    expect(visionLobesOf(spec())).toEqual([{ direction: 0, angle: 360, rangeScale: 1 }]);
  });

  it('gives a cone the spread it was set', () => {
    expect(visionLobesOf(spec({ shape: VisionShape.CONE, coneAngle: 90 }))).toEqual([
      { direction: 0, angle: 90, rangeScale: 1 },
    ]);
  });

  it('puts the second lobe of a front and back pair behind the first', () => {
    const lobes = visionLobesOf(spec({ shape: VisionShape.CONE_BACK }));
    expect(lobes).toHaveLength(2);
    expect(lobes[1].direction).toBe(180);
    expect(lobes[1].rangeScale).toBe(0.4);
  });

  it('spaces many faces evenly round the piece', () => {
    const lobes = visionLobesOf(spec({ shape: VisionShape.CONE_MULTI, coneCount: 4 }));
    expect(lobes.map((lobe) => lobe.direction)).toEqual([0, 90, 180, 270]);
  });

  it('gives a piece with side sight a short lobe all the way round', () => {
    const lobes = visionLobesOf(spec({ shape: VisionShape.CONE_PERIPHERAL }));
    expect(lobes[1]).toEqual({ direction: 0, angle: 360, rangeScale: 0.3 });
  });

  it('reads a hand written list back', () => {
    const written = formatVisionLobes([
      { direction: 0, angle: 120, rangeScale: 1 },
      { direction: 180, angle: 90, rangeScale: 0.5 },
    ]);
    expect(visionLobesOf(spec({ shape: VisionShape.CUSTOM, lobes: written }))).toEqual(parseVisionLobes(written));
  });

  it('falls back to a dome when the list says nothing', () => {
    expect(visionLobesOf(spec({ shape: VisionShape.CUSTOM, lobes: 'nonsense' }))).toEqual([
      { direction: 0, angle: 360, rangeScale: 1 },
    ]);
  });
});

describe('visionLobeScale', () => {
  const cone = visionLobesOf(spec({ shape: VisionShape.CONE, coneAngle: 90 }));

  it('sees straight ahead and not behind', () => {
    expect(visionLobeScale(cone, 0, 0, 0, 100, 0)).toBe(1);
    expect(visionLobeScale(cone, 0, 0, 0, -100, 0)).toBe(0);
  });

  it('holds the edge of the spread and lets go just past it', () => {
    expect(visionLobeScale(cone, 0, 0, 0, 100, 99)).toBe(1);
    expect(visionLobeScale(cone, 0, 0, 0, 100, 101)).toBe(0);
  });

  it('turns with the piece', () => {
    expect(visionLobeScale(cone, 180, 0, 0, -100, 0)).toBe(1);
    expect(visionLobeScale(cone, 180, 0, 0, 100, 0)).toBe(0);
  });

  it('takes the longer of two lobes that overlap', () => {
    const lobes = visionLobesOf(spec({ shape: VisionShape.CONE_PERIPHERAL, coneAngle: 90 }));
    expect(visionLobeScale(lobes, 0, 0, 0, 100, 0)).toBe(1);
    expect(visionLobeScale(lobes, 0, 0, 0, -100, 0)).toBe(0.3);
  });

  it('sees the ground it stands on whichever way it faces', () => {
    expect(visionLobeScale(cone, 0, 50, 50, 50, 50)).toBe(1);
  });

  it('reports the longest lobe it holds', () => {
    expect(maxLobeScale(visionLobesOf(spec({ shape: VisionShape.CONE_BACK })))).toBe(1);
  });
});

describe('applyVisionShape', () => {
  it('fills the fields a shape needs', () => {
    const target: MutableVisionFields = {
      visionShape: VisionShape.DOME,
      visionConeAngle: 0,
      visionConeCount: 0,
      visionBackAngle: 0,
      visionBackScale: 0,
      visionPeripheralScale: 0,
    };
    applyVisionShape(target, VisionShape.CONE_MULTI);
    expect(target.visionShape).toBe(VisionShape.CONE_MULTI);
    expect(target.visionConeCount).toBe(VISION_SHAPE_DEFAULTS[VisionShape.CONE_MULTI].coneCount);
  });

  it('leaves a hand made shape alone', () => {
    const target: MutableVisionFields = {
      visionShape: VisionShape.DOME,
      visionConeAngle: 77,
      visionConeCount: 1,
      visionBackAngle: 1,
      visionBackScale: 1,
      visionPeripheralScale: 1,
    };
    applyVisionShape(target, VisionShape.CUSTOM);
    expect(target.visionConeAngle).toBe(77);
  });

  it('reads an unknown name as a dome', () => {
    expect(asVisionShape('nothing like it')).toBe(VisionShape.DOME);
  });
});

describe('facingBearing', () => {
  it('reads a piece with no turn on it as facing up the table', () => {
    expect(facingBearing(0)).toBe(FACING_BEARING_OFFSET);
    const lobes = visionLobesOf(spec({ shape: VisionShape.CONE, coneAngle: 90 }));
    // Up the table is where the arrow over an unturned piece points.
    expect(visionLobeScale(lobes, facingBearing(0), 0, 0, 0, -100)).toBe(1);
    expect(visionLobeScale(lobes, facingBearing(0), 0, 0, 0, 100)).toBe(0);
  });

  it('turns the same way the piece is turned', () => {
    const lobes = visionLobesOf(spec({ shape: VisionShape.CONE, coneAngle: 90 }));
    expect(visionLobeScale(lobes, facingBearing(90), 0, 0, 100, 0)).toBe(1);
    expect(visionLobeScale(lobes, facingBearing(180), 0, 0, 0, 100)).toBe(1);
    expect(visionLobeScale(lobes, facingBearing(270), 0, 0, -100, 0)).toBe(1);
  });

  it('adds the offset a piece keeps on top of its turn', () => {
    expect(facingBearing(30, 15)).toBe(30 + 15 + FACING_BEARING_OFFSET);
  });
});
