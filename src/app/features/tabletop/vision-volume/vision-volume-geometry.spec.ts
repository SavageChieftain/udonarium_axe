import { visionLobesOf, VisionShape, VisionSpec } from '@axe/domain/tabletop/vision-shape';
import {
  visionVolumeShape,
  VOLUME_RIB_STEP_DEG,
  VOLUME_RING_COUNT,
} from '@axe/features/tabletop/vision-volume/vision-volume-geometry';
import { describe, expect, it } from 'vitest';

function lobesOf(shape: VisionShape, partial: Partial<VisionSpec> = {}) {
  return visionLobesOf({
    shape,
    coneAngle: 90,
    coneCount: 3,
    backAngle: 90,
    backScale: 0.5,
    peripheralScale: 0.25,
    direction: 0,
    lobes: '',
    ...partial,
  });
}

function shapeAt(shape: VisionShape, direction = 0, partial: Partial<VisionSpec> = {}) {
  return visionVolumeShape({
    x: 500,
    y: 400,
    z: 0,
    radiusPx: 200,
    direction,
    lobes: lobesOf(shape, partial),
  });
}

describe('visionVolumeShape', () => {
  it('puts every ring on the sphere it stands for', () => {
    const { rings } = shapeAt(VisionShape.DOME);
    expect(rings).toHaveLength(VOLUME_RING_COUNT);
    for (const ring of rings) {
      expect(Math.hypot(ring.radius, ring.height)).toBeCloseTo(200, 6);
      expect(ring.size).toBeCloseTo(ring.radius * 2, 6);
    }
  });

  it('starts on the ground and climbs from there', () => {
    const { rings } = shapeAt(VisionShape.DOME);
    expect(rings[0].height).toBe(0);
    expect(rings[0].radius).toBeCloseTo(200, 6);
    for (let i = 1; i < rings.length; i++) expect(rings[i].height).toBeGreaterThan(rings[i - 1].height);
  });

  it('leaves a shape that goes all the way round uncut', () => {
    for (const ring of shapeAt(VisionShape.DOME).rings) expect(ring.clipPath).toBeNull();
  });

  it('cuts a cone back to the ground it covers', () => {
    const { rings } = shapeAt(VisionShape.CONE);
    for (const ring of rings) expect(ring.clipPath).toMatch(/^polygon\(50% 50%,/);
  });

  it('stands a rib at each edge of a cone', () => {
    const { ribs } = shapeAt(VisionShape.CONE);
    const bearings = ribs.map((rib) => rib.bearing);
    expect(Math.min(...bearings)).toBeCloseTo(-45, 6);
    expect(Math.max(...bearings)).toBeCloseTo(45, 6);
  });

  it('turns the whole shape with the piece', () => {
    const { ribs } = shapeAt(VisionShape.CONE, 90);
    const bearings = ribs.map((rib) => rib.bearing);
    expect(Math.min(...bearings)).toBeCloseTo(45, 6);
    expect(Math.max(...bearings)).toBeCloseTo(135, 6);
  });

  it('spaces the ribs of a shape that goes all the way round', () => {
    const { ribs } = shapeAt(VisionShape.DOME);
    expect(ribs).toHaveLength(360 / VOLUME_RIB_STEP_DEG);
  });

  it('gives a shorter lobe a shorter set of rings', () => {
    const { rings } = shapeAt(VisionShape.CONE_BACK);
    const reaches = rings.map((ring) => Math.hypot(ring.radius, ring.height));
    expect(Math.max(...reaches)).toBeCloseTo(200, 6);
    expect(Math.min(...reaches)).toBeCloseTo(100, 6);
  });

  it('draws nothing at all when a piece sees nothing', () => {
    const empty = visionVolumeShape({ x: 0, y: 0, z: 0, radiusPx: 0, direction: 0, lobes: lobesOf(VisionShape.DOME) });
    expect(empty.rings).toHaveLength(0);
    expect(empty.ribs).toHaveLength(0);
  });
});
