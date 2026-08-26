import { seededRandom } from '@axe/core/util/seeded-random';
import { mergeMaskToRects } from '@axe/domain/tabletop/dungeon/rect-merge';
import {
  FIELD_PROP_IDS,
  FIELD_PROP_SHAPES,
  FieldAtmosphere,
  FieldPropId,
} from '@axe/domain/tabletop/field/field-atmosphere';
import { FieldLayout } from '@axe/domain/tabletop/field/field-layout';
import { MapBlock, MapBlocks, MapLight, MapLightKind, MapPaint } from '@axe/domain/tabletop/map-blocks';

/**
 * How wide a clump of the same thing is allowed to grow before it is broken in two.
 *
 * A wood merged without limit becomes one canopy the size of the board, which reads as a
 * plateau rather than trees. Three cells is a stand of trees.
 */
export const FIELD_MERGE_SPAN = 4;

const OPEN_FIRES: readonly MapLightKind[] = ['campfire', 'stand', 'brazier'];

/** How far each layer is turned past the one below it, so their corners never line up. */
const LAYER_TWIST = 11;

function maskOfBand(layout: FieldLayout, band: number): Uint8Array {
  const mask = new Uint8Array(layout.width * layout.height);
  for (let i = 0; i < mask.length; i++) mask[i] = layout.ground[i] === band ? 1 : 0;
  return mask;
}

function maskOfProp(layout: FieldLayout, prop: FieldPropId): Uint8Array {
  const mask = new Uint8Array(layout.width * layout.height);
  for (let i = 0; i < mask.length; i++) mask[i] = layout.props[i] === prop ? 1 : 0;
  return mask;
}

/** Somewhere out in the open, well away from anything already lit. */
function findFires(layout: FieldLayout, atmosphere: FieldAtmosphere, seed: number): MapLight[] {
  const lights: MapLight[] = [];
  if (atmosphere.torches < 1) return lights;
  const rng = seededRandom(seed + 3301);
  const apart = Math.max(6, Math.round(Math.min(layout.width, layout.height) / 3));

  for (let tries = 0; tries < 400 && lights.length < atmosphere.torches; tries++) {
    const x = 1 + Math.floor(rng() * (layout.width - 2));
    const y = 1 + Math.floor(rng() * (layout.height - 2));
    const index = y * layout.width + x;
    if (layout.props[index]) continue;
    if (atmosphere.bands[layout.ground[index]].bare) continue;
    if (lights.some((light) => Math.abs(light.x - x) < apart && Math.abs(light.y - y) < apart)) continue;
    lights.push({ x, y, kind: OPEN_FIRES[lights.length % OPEN_FIRES.length], facing: 0, room: lights.length });
  }

  return lights;
}

export function fieldToBlocks(layout: FieldLayout, atmosphere: FieldAtmosphere, seed: number): MapBlocks {
  const blocks: MapBlock[] = [];
  const paint: MapPaint[] = [];

  atmosphere.bands.forEach((band, index) => {
    const mask = maskOfBand(layout, index);
    for (const rect of mergeMaskToRects(mask, layout.width, layout.height, FIELD_MERGE_SPAN)) {
      paint.push({ kind: 'floor', rect, material: { kind: 'texture', id: band.texture } });
    }
  });

  for (const prop of FIELD_PROP_IDS) {
    if (FIELD_PROP_SHAPES[prop].layers) continue;
    const shape = FIELD_PROP_SHAPES[prop];
    const mask = maskOfProp(layout, prop);
    for (const rect of mergeMaskToRects(mask, layout.width, layout.height, FIELD_MERGE_SPAN)) {
      blocks.push({
        kind: 'prop',
        rect,
        blocksSight: shape.blocksSight,
        locked: false,
        rooms: [],
        skin: { side: { kind: 'texture', id: shape.side }, top: { kind: 'texture', id: shape.top } },
        height: shape.height,
      });
    }
  }

  for (const object of layout.objects) {
    const shape = FIELD_PROP_SHAPES[object.prop];
    const skin = object.skin ?? { side: shape.side, top: shape.top };
    const reach = (object.span - 1) / 2;
    const rect = { x: object.x - reach, y: object.y - reach, w: object.span, h: object.span };

    if (shape.trunk) {
      const trunk = shape.trunk;
      blocks.push({
        kind: 'prop',
        rect: { x: object.x, y: object.y, w: 1, h: 1 },
        blocksSight: false,
        locked: false,
        rooms: [],
        skin: { side: { kind: 'texture', id: trunk.side }, top: { kind: 'texture', id: trunk.top } },
        height: trunk.height + object.lift,
        footprint: { w: trunk.width, d: trunk.width },
        rotate: object.spin,
      });
    }

    // Layer on layer, each narrower than the one under it and each turned a little further,
    // so that the corners never line up into the flat sides of a box.
    let standing = (shape.altitude ?? 0) + object.lift;
    const layers = shape.layers ?? [{ spread: object.span, height: shape.height }];
    layers.forEach((layer, index) => {
      const spread = Math.min(layer.spread, object.span);
      const squash = 1 + object.squash * (index % 2 === 0 ? 1 : -1);
      blocks.push({
        kind: 'prop',
        rect,
        blocksSight: shape.blocksSight && spread > 1,
        locked: false,
        rooms: [],
        skin: { side: { kind: 'texture', id: skin.side }, top: { kind: 'texture', id: skin.top } },
        height: layer.height,
        footprint: { w: spread * squash, d: spread / squash },
        altitude: standing,
        rotate: object.spin + index * LAYER_TWIST,
      });
      standing += layer.height;
    });
  }

  const lights = findFires(layout, atmosphere, seed);

  return {
    blocks,
    paint,
    torchRooms: lights.map((light) => light.room),
    torchSpots: lights.map((light) => ({ x: light.x, y: light.y })),
    lights,
  };
}
