import { WallLight } from '@axe/domain/tabletop/vision-scene';
import { wallLightLayerStyle } from '@axe/features/tabletop/wall-projection';

function pool(partial: Partial<WallLight> = {}): WallLight {
  return { localX: 100, localY: 40, radiusX: 80, radiusY: 80, color: '#ffffff', intensity: 1, ...partial };
}

describe('wallLightLayerStyle', () => {
  it('leaves a pool nothing blocks unclipped', () => {
    expect(wallLightLayerStyle(pool())['clip-path']).toBeUndefined();
  });

  it('cuts the pool along the foot of the lit part', () => {
    const style = wallLightLayerStyle(
      pool({
        shadow: [
          { x: 20, y: 0 },
          { x: 60, y: 0 },
          { x: 60, y: 50 },
          { x: 180, y: 50 },
        ],
      })
    );
    expect(style['clip-path']).toBe(
      'polygon(20.00px 0px, 180.00px 0px, 180.00px 50.00px, 60.00px 50.00px, 60.00px 0.00px, 20.00px 0.00px)'
    );
  });

  it('reads the cut from the other end on a mirrored face', () => {
    const style = wallLightLayerStyle(
      pool({
        shadow: [
          { x: 20, y: 0 },
          { x: 180, y: 50 },
        ],
      }),
      true,
      200
    );
    expect(style['clip-path']).toBe('polygon(20.00px 0px, 180.00px 0px, 180.00px 0.00px, 20.00px 50.00px)');
  });
});
