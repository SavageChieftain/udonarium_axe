import { DEFAULT_VIEW_ROTATION, projectDirection } from '@axe/domain/effect/effect-view';

describe('projectDirection()', () => {
  const flat = { x: 0, y: 0, z: 0 };

  it('leaves the board pointing as the screen does when it is not turned', () => {
    expect(projectDirection(100, 0, 0, flat)).toEqual({ angle: 0, length: 100 });
    expect(projectDirection(0, 100, 0, flat).angle).toBeCloseTo(90);
  });

  it('foreshortens the depth as the view looks down', () => {
    const away = projectDirection(0, 100, 0, { x: 60, y: 0, z: 0 });

    // Tilted, a length into the screen collapses by the cosine of the tilt.
    expect(away.length).toBeCloseTo(50);
  });

  it('turns the vertical into up the screen', () => {
    const up = projectDirection(0, 0, 100, { x: 90, y: 0, z: 0 });

    expect(up.length).toBeCloseTo(100);
    expect(up.angle).toBeCloseTo(-90);
  });

  it('turns the angle on the screen with the board', () => {
    expect(projectDirection(100, 0, 0, { x: 0, y: 0, z: 30 }).angle).toBeCloseTo(30);
  });

  it('leaves the angle at nothing for a length of nothing', () => {
    expect(projectDirection(0, 0, 0, null)).toEqual({ angle: 0, length: 0 });
  });

  it('falls back to the usual tilt when none is given', () => {
    expect(projectDirection(0, 100, 0, null)).toEqual(projectDirection(0, 100, 0, DEFAULT_VIEW_ROTATION));
  });
});
