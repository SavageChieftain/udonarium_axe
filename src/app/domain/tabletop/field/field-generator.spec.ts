import {
  FIELD_ATMOSPHERE_IDS,
  FIELD_PROP_SHAPES,
  fieldAtmosphereById,
  MAX_FIELD_SIZE,
} from '@axe/domain/tabletop/field/field-atmosphere';
import { fieldBoardSize, planField } from '@axe/domain/tabletop/field/field-generator';
import { propAt } from '@axe/domain/tabletop/field/field-layout';
import { MAP_MAX_TERRAINS } from '@axe/domain/tabletop/map-blocks';

const SEEDS = [1, 7, 42, 1234, 999];

describe('fieldBoardSize()', () => {
  it('lays a board three deep for every four across', () => {
    expect(fieldBoardSize(40)).toEqual({ width: 40, height: 30 });
    expect(fieldBoardSize(60)).toEqual({ width: 60, height: 45 });
  });

  it('holds to the sizes the panel offers', () => {
    expect(fieldBoardSize(2).width).toBe(20);
    expect(fieldBoardSize(500).width).toBe(MAX_FIELD_SIZE);
  });
});

describe('planField()', () => {
  it('lays out the same field twice for one seed, and another for another', () => {
    const first = planField({ atmosphere: 'woodland', size: 40, density: 50, seed: 7 });
    const again = planField({ atmosphere: 'woodland', size: 40, density: 50, seed: 7 });
    const other = planField({ atmosphere: 'woodland', size: 40, density: 50, seed: 8 });

    expect([...again.layout.ground]).toEqual([...first.layout.ground]);
    expect(again.layout.props).toEqual(first.layout.props);
    expect([...other.layout.ground]).not.toEqual([...first.layout.ground]);
  });

  it('paints every cell of the board and no more', () => {
    for (const id of FIELD_ATMOSPHERE_IDS) {
      const plan = planField({ atmosphere: id, size: 30, density: 50, seed: 7 });
      const painted = plan.blocks.paint.reduce((total, patch) => total + patch.rect.w * patch.rect.h, 0);

      expect(painted).toBe(plan.layout.width * plan.layout.height);
      expect(plan.blocks.paint.every((patch) => patch.material)).toBe(true);
    }
  });

  it('grows every band of ground it was given, on a board big enough to hold them', () => {
    for (const id of FIELD_ATMOSPHERE_IDS) {
      const plan = planField({ atmosphere: id, size: 50, density: 50, seed: 7 });
      const found = new Set(plan.layout.ground);

      expect(found.size).toBe(fieldAtmosphereById(id).bands.length);
    }
  });

  it('leaves open water bare', () => {
    const plan = planField({ atmosphere: 'coast', size: 50, density: 100, seed: 7 });
    const atmosphere = fieldAtmosphereById('coast');

    for (let y = 0; y < plan.layout.height; y++) {
      for (let x = 0; x < plan.layout.width; x++) {
        const band = atmosphere.bands[plan.layout.ground[y * plan.layout.width + x]];
        if (band.bare) expect(propAt(plan.layout, x, y)).toBe('');
      }
    }
  });

  it('puts nothing over the edge of the board', () => {
    for (const id of FIELD_ATMOSPHERE_IDS) {
      const plan = planField({ atmosphere: id, size: 40, density: 100, seed: 42 });

      for (const block of plan.blocks.blocks) {
        expect(block.rect.x + block.rect.w).toBeLessThanOrEqual(plan.layout.width);
        expect(block.rect.y + block.rect.h).toBeLessThanOrEqual(plan.layout.height);
      }
    }
  });

  it('leaves the ground open enough to walk over', () => {
    for (const id of FIELD_ATMOSPHERE_IDS) {
      for (const seed of SEEDS) {
        const plan = planField({ atmosphere: id, size: 40, density: 100, seed });
        const taken = plan.layout.props.filter((prop) => prop !== '').length;

        expect(taken / plan.layout.props.length).toBeLessThan(0.5);
      }
    }
  });

  it('builds each thing that stands out of its own stuff', () => {
    const plan = planField({ atmosphere: 'woodland', size: 40, density: 50, seed: 7 });
    const shapes = Object.values(FIELD_PROP_SHAPES);

    expect(plan.blocks.blocks.length).toBeGreaterThan(0);
    for (const block of plan.blocks.blocks) {
      expect(block.kind).toBe('prop');
      const side = block.skin?.side;
      const top = block.skin?.top;
      const named = side?.kind === 'texture' && top?.kind === 'texture';
      expect(named && shapes.some((shape) => shape.side === side.id && shape.top === top.id)).toBe(true);
      expect(block.height).toBeGreaterThan(0);
    }
  });

  it('stands its fires apart, out in the open', () => {
    for (const id of FIELD_ATMOSPHERE_IDS) {
      const plan = planField({ atmosphere: id, size: 40, density: 50, seed: 7 });
      const atmosphere = fieldAtmosphereById(id);

      expect(plan.blocks.lights.length).toBeGreaterThan(0);
      expect(plan.blocks.lights.length).toBeLessThanOrEqual(atmosphere.torches);
      for (const light of plan.blocks.lights) {
        expect(propAt(plan.layout, light.x, light.y)).toBe('');
        expect(atmosphere.bands[plan.layout.ground[light.y * plan.layout.width + light.x]].bare).toBeFalsy();
      }
    }
  });

  it('thins out when the panel asks for less, and thickens when it asks for more', () => {
    const bare = planField({ atmosphere: 'woodland', size: 40, density: 0, seed: 7 });
    const some = planField({ atmosphere: 'woodland', size: 40, density: 50, seed: 7 });
    const many = planField({ atmosphere: 'woodland', size: 40, density: 100, seed: 7 });

    expect(bare.blocks.blocks.length).toBe(0);
    expect(some.blocks.blocks.length).toBeGreaterThan(0);
    expect(many.blocks.blocks.length).toBeGreaterThan(some.blocks.blocks.length);
  });

  it('stays inside the budget at the size and thickness it starts on', () => {
    for (const id of FIELD_ATMOSPHERE_IDS) {
      for (const seed of SEEDS) {
        const plan = planField({ atmosphere: id, size: 40, density: 50, seed });

        expect(plan.blocks.blocks.length).toBeLessThanOrEqual(MAP_MAX_TERRAINS);
      }
    }
  });
});
