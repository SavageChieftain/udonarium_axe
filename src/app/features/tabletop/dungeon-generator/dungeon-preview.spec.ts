import { TEXTURE_BASE_COLOR, WALL_TEXTURE_BASE_COLOR } from '@axe/domain/media/texture-catalog';
import { planDungeon } from '@axe/domain/tabletop/dungeon/dungeon-generator';
import {
  buildDungeonPreview,
  previewColors,
  TORCH_FILL,
} from '@axe/features/tabletop/dungeon-generator/dungeon-preview';

const colors = previewColors('wall_ashlar', 'stone_paving_big', 'lava');

function plan(atmosphere: 'stoneDungeon' | 'lavaCavern' = 'stoneDungeon') {
  return planDungeon({ atmosphere, roomCount: 8, seed: 7 });
}

describe('previewColors()', () => {
  it('reads the floor and the hazard straight out of the catalog', () => {
    expect(colors.floor).toBe(TEXTURE_BASE_COLOR.stone_paving_big);
    expect(colors.hazard).toBe(TEXTURE_BASE_COLOR.lava);
  });

  it('sinks the rock below the floor so the plan can be read', () => {
    // Ashlar and the paving beside it are near enough the same grey to read as one field.
    const brightness = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);

    expect(colors.wall).not.toBe(WALL_TEXTURE_BASE_COLOR.wall_ashlar);
    expect(brightness(colors.wall)).toBeLessThan(brightness(colors.floor) * 0.6);
  });

  it('falls back to a plain grey for a picture from the library', () => {
    const fallback = previewColors('some-hash', 'other-hash', 'lava');

    expect(fallback.wall).toMatch(/^#[0-9a-f]{6}$/);
    expect(fallback.floor).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('buildDungeonPreview()', () => {
  it('spans the board in cells', () => {
    const { layout, blocks } = plan();

    expect(buildDungeonPreview(layout, blocks.blocks, colors).viewBox).toBe(`0 0 ${layout.width} ${layout.height}`);
  });

  it('draws one rectangle per block, so the count on screen is the count that gets built', () => {
    const { layout, blocks } = plan();

    expect(buildDungeonPreview(layout, blocks.blocks, colors).rects.length).toBe(blocks.blocks.length);
  });

  it('keeps every rectangle where its block is', () => {
    const { layout, blocks } = plan();
    const preview = buildDungeonPreview(layout, blocks.blocks, colors);

    blocks.blocks.forEach((block, index) => {
      expect(preview.rects[index]).toMatchObject(block.rect);
    });
  });

  it('paints walls and floors from the chosen materials', () => {
    const { layout, blocks } = plan();
    const preview = buildDungeonPreview(layout, blocks.blocks, colors);

    blocks.blocks.forEach((block, index) => {
      if (block.kind === 'wall') expect(preview.rects[index].fill).toBe(colors.wall);
      if (block.kind === 'floor') expect(preview.rects[index].fill).toBe(colors.floor);
    });
  });

  it('marks where each torch stands', () => {
    const { layout, blocks } = plan();
    const preview = buildDungeonPreview(layout, blocks.blocks, colors);
    const torches = blocks.blocks.filter((block) => block.kind === 'torch').length;

    expect(torches).toBeGreaterThan(0);
    expect(torches).toBe(blocks.torchSpots.length);
    expect(preview.rects.filter((rect) => rect.fill === TORCH_FILL).length).toBe(torches);
  });

  it('shows the lava in a cave that has some', () => {
    const { layout, blocks } = plan('lavaCavern');
    const preview = buildDungeonPreview(layout, blocks.blocks, colors);
    const hazard = blocks.blocks.filter((block) => block.kind === 'hazard').length;

    expect(hazard).toBeGreaterThan(0);
    expect(preview.rects.filter((rect) => rect.fill === colors.hazard).length).toBe(hazard);
  });
});
