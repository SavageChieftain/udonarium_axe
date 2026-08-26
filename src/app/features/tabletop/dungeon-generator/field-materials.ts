import { FieldAtmosphere } from '@axe/domain/tabletop/field/field-atmosphere';
import { MapBlocks, MapMaterial } from '@axe/domain/tabletop/map-blocks';

/**
 * Puts the chosen materials over the ones the preset picked.
 *
 * A field is painted in bands, so there is no one floor to swap: the ground the panel
 * offers stands for the band the preset calls its own, and the rest keep their places.
 */
export function withFieldMaterials(
  blocks: MapBlocks,
  atmosphere: FieldAtmosphere,
  ground: MapMaterial,
  prop: MapMaterial
): MapBlocks {
  const base = atmosphere.defaultGround;
  return {
    ...blocks,
    paint: blocks.paint.map((patch) =>
      patch.material?.kind === 'texture' && patch.material.id === base ? { ...patch, material: ground } : patch
    ),
    blocks: blocks.blocks.map((block) => (block.skin ? { ...block, skin: { ...block.skin, side: prop } } : block)),
  };
}
