import { type EffectCast } from '@axe/domain/effect/effect-cast';
import { effectParticles } from '@axe/domain/effect/effect-particles';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { type EffectStage } from '@axe/domain/effect/effect-stage';
import {
  stagedEffectDuration,
  stagedEffectParticles,
  stagedEffectSprites,
} from '@axe/domain/effect/effect-stage-timeline';
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

  it('draws what each branch goes on to do, not only the throw itself', () => {
    // The stage that throws is one window; each branch is another, and it is the branches
    // that carry the run onwards.
    const stages = [
      stage({
        role: 'spawn',
        kind: 'burst',
        durationMs: 100,
        branches: 3,
        children: [stage({ kind: 'frost', durationMs: 400 })],
      }),
    ];

    const sprites = stagedEffectSprites(makePreset(), stages, castOn(), 200, options, paintEffectKind);
    const orders = new Set(sprites.map((sprite) => sprite.key.split('-')[1]));

    expect(orders.size).toBeGreaterThan(1);
    expect([...orders]).toContain('1');
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

  it('tells a stage the length of its own window, not the length of the run', () => {
    // The painters lay their animations out against the length they are given.
    const preset = makePreset();
    preset.stages = JSON.stringify([
      { role: 'travel', kind: 'projectile', durationMs: 600 },
      { role: 'impact', kind: 'burst', durationMs: 400 },
    ]);
    const stages = preset.stageList;
    const lengths: number[] = [];

    stagedEffectSprites(preset, stages, castOn(), 700, options, (_kind, context) => {
      lengths.push(context.preset.duration);
    });

    expect(lengths).toEqual([400]);
  });

  it('lays out the same list once however many targets it plays on', () => {
    const preset = makePreset();
    const stages = [stage()];
    const seen = new Set<object>();

    stagedEffectSprites(preset, stages, castOn(3), 200, options, (_kind, context) => {
      seen.add(context.preset);
    });

    expect(seen.size).toBe(1);
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

describe('stagedEffectParticles()', () => {
  const created: EffectPreset[] = [];

  function makePreset(): EffectPreset {
    const preset = new EffectPreset();
    preset.kind = 'burst';
    preset.durationMs = 900;
    preset.initialize();
    created.push(preset);
    return preset;
  }

  function castOn(count = 1): EffectCast {
    return {
      presetIdentifier: 'preset',
      casterIdentifier: 'caster',
      origin: { x: 0, y: 0, z: 0 },
      targets: Array.from({ length: count }, (_, index) => ({ identifier: `target-${index}`, x: 400, y: 0, z: 0 })),
      seed: 7,
    };
  }

  afterEach(() => {
    for (const preset of created.splice(0)) preset.destroy();
  });

  it('glows once for each stage that is up', () => {
    const stages: EffectStage[] = [
      { role: 'field', kind: 'flame', durationMs: 2000 },
      { role: 'impact', kind: 'burst', durationMs: 2000 },
    ];

    const placements = stagedEffectParticles(
      makePreset(),
      stages,
      castOn(),
      400,
      50,
      { baseSize: 50 },
      effectParticles
    );

    expect(placements.length).toBeGreaterThan(1);
  });

  it('glows where a branch went rather than back at the target', () => {
    const stages: EffectStage[] = [
      {
        role: 'spawn',
        kind: 'burst',
        durationMs: 100,
        branches: 2,
        spreadDeg: 180,
        children: [{ role: 'impact', kind: 'flame', durationMs: 400 }],
      },
    ];

    const placements = stagedEffectParticles(
      makePreset(),
      stages,
      castOn(),
      200,
      50,
      { baseSize: 50 },
      effectParticles
    );
    const centres = placements.map((placement) => `${placement.center.x},${placement.center.y}`);

    expect(new Set(centres).size).toBeGreaterThan(1);
  });

  it('makes no more glows than it was told to keep', () => {
    // The canvases are capped; making what is thrown away is work for nothing.
    const stages: EffectStage[] = [
      { role: 'field', kind: 'flame', durationMs: 2000 },
      { role: 'impact', kind: 'burst', durationMs: 2000 },
    ];
    let made = 0;
    const count = (...args: Parameters<typeof effectParticles>) => {
      made++;
      return effectParticles(...args);
    };

    const placements = stagedEffectParticles(makePreset(), stages, castOn(4), 400, 50, { baseSize: 50 }, count, 3);

    expect(placements.length).toBeLessThanOrEqual(3);
    expect(made).toBeLessThanOrEqual(3);
  });

  it('glows nowhere for a run with no stages', () => {
    expect(stagedEffectParticles(makePreset(), [], castOn(), 0, 50, { baseSize: 50 }, effectParticles)).toEqual([]);
  });
});
