import { glideTransform } from '@axe/features/tabletop/game-table/game-table-camera';

describe('glideTransform', () => {
  const still = { rotateX: 0, rotateZ: 0, positionX: 0, positionY: 0, positionZ: 0 };

  it('slides the table so the focus comes to the centre', () => {
    expect(glideTransform({ x: 300, y: 250 }, { x: 100, y: 200 }, still)).toEqual({ x: -100, y: -50, z: -0 });
  });

  it('turns the slide with the camera and takes the current position off', () => {
    const turned = { ...still, rotateZ: 90, positionX: 10, positionY: 20, positionZ: 30 };
    const moved = glideTransform({ x: 200, y: 100 }, { x: 100, y: 100 }, turned);
    expect(moved.x).toBeCloseTo(90);
    expect(moved.y).toBeCloseTo(-120);
    expect(moved.z).toBeCloseTo(-30);
  });

  it('lifts part of a tilted slide into depth', () => {
    const tilted = { ...still, rotateX: 60 };
    const moved = glideTransform({ x: 100, y: 300 }, { x: 100, y: 100 }, tilted);
    expect(moved.x).toBe(100);
    expect(moved.y).toBeCloseTo(-100);
    expect(moved.z).toBeCloseTo(-173.205);
  });
});
