import { type EffectCast } from '@axe/domain/effect/effect-cast';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { type EffectStage } from '@axe/domain/effect/effect-stage';
import { stagedEffectDuration, stagedEffectSprites } from '@axe/domain/effect/effect-stage-timeline';
import { paintEffectKind } from '@axe/domain/effect/effect-timeline';
import { type EffectSpriteOptions } from '@axe/domain/effect/timeline/shared';

describe('stagedEffectSprites()', () => {
  const created: EffectPreset[] = [];

  function makePreset(): EffectPreset {
    const preset = new EffectPreset();
    preset.name = 'ためし';
    preset.kind = 'burst';
    preset.colorPrimary = '#ffffff';
    preset.durationMs = 900;
    preset.initialize();
    created.push(preset);
    return preset;
  }

  function stage(overrides: Partial<EffectStage> = {}): EffectStage {
    return { role: 'impact', kind: 'burst', durationMs: 400, ...overrides };
  }

  function castOn(count = 1): EffectCast {
    return {
      presetIdentifier: 'preset',
      casterIdentifier: 'caster',
      origin: { x: 0, y: 0, z: 0 },
      targets: Array.from({ length: count }, (_, index) => ({
        identifier: `target-${index}`,
        x: 400,
        y: 0,
        z: 0,
      })),
      seed: 7,
    };
  }

  const options: EffectSpriteOptions = { baseSize: 50 };

  afterEach(() => {
    for (const preset of created.splice(0)) preset.destroy();
  });

  it('draws nothing for a run with no stages', () => {
    expect(stagedEffectSprites(makePreset(), [], castOn(), 0, options, paintEffectKind)).toEqual([]);
  });

  it('draws the stage the clock is inside of', () => {
    const stages = [stage({ role: 'travel', kind: 'projectile', durationMs: 600 }), stage({ kind: 'frost' })];

    const flying = stagedEffectSprites(makePreset(), stages, castOn(), 300, options, paintEffectKind);
    const landed = stagedEffectSprites(makePreset(), stages, castOn(), 800, options, paintEffectKind);

    expect(flying.length).toBeGreaterThan(0);
    expect(landed.length).toBeGreaterThan(0);
    expect(flying.map((sprite) => sprite.key)).not.toEqual(landed.map((sprite) => sprite.key));
  });

  it('draws nothing before the run starts or after it ends', () => {
    const stages = [stage()];

    expect(stagedEffectSprites(makePreset(), stages, castOn(), -10, options, paintEffectKind)).toEqual([]);
    expect(stagedEffectSprites(makePreset(), stages, castOn(), 900, options, paintEffectKind)).toEqual([]);
  });

  it('gives every sprite a key of its own', () => {
    const stages = [
      stage({ role: 'travel', kind: 'projectile', durationMs: 400 }),
      stage({ kind: 'frost', durationMs: 400 }),
    ];

    const sprites = stagedEffectSprites(makePreset(), stages, castOn(3), 200, options, paintEffectKind);
    const keys = sprites.map((sprite) => sprite.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('waits for the stagger before the next target starts', () => {
    const preset = makePreset();
    preset.staggerMs = 300;

    const sprites = stagedEffectSprites(preset, [stage()], castOn(2), 100, options, paintEffectKind);

    expect(sprites.every((sprite) => sprite.key.startsWith('0-'))).toBe(true);
  });

  it('leaves the effect itself alone while it draws', () => {
    // The stage lays its own values over a preset everybody at the table shares.
    const preset = makePreset();
    const stages = [stage({ kind: 'frost', colorPrimary: '#00ffff', grade: 3, durationMs: 400 })];

    stagedEffectSprites(preset, stages, castOn(), 200, options, paintEffectKind);

    expect(preset.kind).toBe('burst');
    expect(preset.colorPrimary).toBe('#ffffff');
    expect(preset.durationMs).toBe(900);
  });

  it('throws a branch away from where the run reached', () => {
    const stages = [
      stage({
        role: 'spawn',
        kind: 'burst',
        durationMs: 100,
        branches: 3,
        spreadDeg: 120,
        children: [stage({ role: 'travel', kind: 'projectile', durationMs: 400 })],
      }),
    ];

    const sprites = stagedEffectSprites(makePreset(), stages, castOn(), 200, options, paintEffectKind);

    expect(sprites.length).toBeGreaterThan(0);
  });

  it('draws every branch of a spawn', () => {
    const withBranches = (branches: number): number =>
      stagedEffectSprites(
        makePreset(),
        [
          stage({
            role: 'spawn',
            kind: 'burst',
            durationMs: 100,
            branches,
            children: [stage({ kind: 'frost', durationMs: 400 })],
          }),
        ],
        castOn(),
        200,
        options,
        paintEffectKind
      ).length;

    expect(withBranches(4)).toBeGreaterThan(withBranches(2));
  });

  it('draws a field for as long as it was given', () => {
    const stages = [
      stage({ role: 'field', kind: 'flame', durationMs: 3000 }),
      stage({ kind: 'burst', durationMs: 400 }),
    ];

    const late = stagedEffectSprites(makePreset(), stages, castOn(), 2000, options, paintEffectKind);

    expect(late.length).toBeGreaterThan(0);
  });
});

describe('stagedEffectDuration()', () => {
  it('runs until the last stage finishes', () => {
    expect(
      stagedEffectDuration([
        { role: 'travel', kind: 'projectile', durationMs: 600 },
        { role: 'impact', kind: 'burst', durationMs: 400 },
      ])
    ).toBe(1000);
  });
});
