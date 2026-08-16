import {
  type EffectStage,
  encodeEffectStages,
  layOutStages,
  MAX_BRANCHES,
  MAX_STAGES,
  parseEffectStages,
  stageDuration,
} from '@axe/domain/effect/effect-stage';

function stage(overrides: Partial<EffectStage> = {}): EffectStage {
  return { role: 'impact', kind: 'burst', durationMs: 400, ...overrides };
}

describe('layOutStages()', () => {
  it('lays nothing out for no stages', () => {
    expect(layOutStages([])).toEqual({ windows: [], totalMs: 80 });
  });

  it('starts each stage where the one before it ended', () => {
    const travel = stage({ role: 'travel', kind: 'projectile', durationMs: 600 });
    const impact = stage({ durationMs: 400 });

    const { windows, totalMs } = layOutStages([travel, impact]);

    expect(windows.map((window) => [window.startMs, window.endMs])).toEqual([
      [0, 600],
      [600, 1000],
    ]);
    expect(totalMs).toBe(1000);
  });

  it('runs what is left behind alongside the rest', () => {
    // A field is where the effect finishes, not something the rest of it waits for.
    const field = stage({ role: 'field', kind: 'flame', durationMs: 3000 });
    const impact = stage({ durationMs: 400 });

    const { windows, totalMs } = layOutStages([field, impact]);

    expect(windows[0]).toMatchObject({ startMs: 0, endMs: 3000 });
    expect(windows[1]).toMatchObject({ startMs: 0, endMs: 400 });
    expect(totalMs).toBe(3000);
  });

  it('throws every branch of a spawn at once', () => {
    const spawn = stage({
      role: 'spawn',
      kind: 'burst',
      durationMs: 100,
      branches: 3,
      spreadDeg: 90,
      children: [stage({ role: 'travel', kind: 'projectile', durationMs: 300 })],
    });

    const { windows } = layOutStages([spawn]);
    const branches = windows.filter((window) => window.branch);

    expect(branches).toHaveLength(3);
    expect(branches.map((window) => window.branch?.index)).toEqual([0, 1, 2]);
    expect(branches.every((window) => window.startMs === 0 && window.endMs === 300)).toBe(true);
  });

  it('runs each branch through the whole chain it was given', () => {
    const spawn = stage({
      role: 'spawn',
      kind: 'burst',
      durationMs: 100,
      branches: 2,
      children: [
        stage({ role: 'travel', kind: 'projectile', durationMs: 300 }),
        stage({ role: 'impact', kind: 'frost', durationMs: 200 }),
      ],
    });

    const { windows, totalMs } = layOutStages([spawn]);
    const first = windows.filter((window) => window.branch?.index === 0);

    expect(first.map((window) => [window.startMs, window.endMs])).toEqual([
      [0, 300],
      [300, 500],
    ]);
    expect(totalMs).toBe(500);
  });

  it('takes a spawn as long as the chain each branch follows', () => {
    const spawn = stage({
      role: 'spawn',
      kind: 'burst',
      durationMs: 100,
      children: [stage({ durationMs: 300 }), stage({ durationMs: 250 })],
    });

    expect(stageDuration(spawn)).toBe(550);
  });
});

describe('parseEffectStages()', () => {
  it('reads a written list back', () => {
    const stages = [stage({ role: 'travel', kind: 'projectile', durationMs: 600 }), stage({ kind: 'frost' })];

    expect(parseEffectStages(encodeEffectStages(stages))).toEqual(stages);
  });

  it('reads nothing from an effect written before stages existed', () => {
    // Which is how it goes on drawing the one look it always drew.
    expect(parseEffectStages('')).toEqual([]);
    expect(parseEffectStages(null)).toEqual([]);
  });

  it('reads nothing out of what it cannot parse', () => {
    expect(parseEffectStages('{')).toEqual([]);
    expect(parseEffectStages('{"role":"impact"}')).toEqual([]);
  });

  it('drops a stage naming a look it does not know', () => {
    expect(parseEffectStages('[{"role":"impact","kind":"nonsense","durationMs":400}]')).toEqual([]);
  });

  it('reads a stage of an unknown role as one that lands', () => {
    expect(parseEffectStages('[{"role":"whatever","kind":"burst","durationMs":400}]')).toEqual([
      { role: 'impact', kind: 'burst', durationMs: 400 },
    ]);
  });

  it('keeps a length that cannot be read at the default', () => {
    expect(parseEffectStages('[{"role":"impact","kind":"burst"}]')[0].durationMs).toBe(500);
  });

  it('holds a length within what can be drawn', () => {
    expect(parseEffectStages('[{"role":"impact","kind":"burst","durationMs":1}]')[0].durationMs).toBe(80);
    expect(parseEffectStages('[{"role":"impact","kind":"burst","durationMs":99999}]')[0].durationMs).toBe(6000);
  });

  it('reads no more stages than one effect may run', () => {
    const many = Array.from({ length: MAX_STAGES + 4 }, () => stage());

    expect(parseEffectStages(JSON.stringify(many))).toHaveLength(MAX_STAGES);
  });

  it('holds the branches of a spawn within what can be thrown', () => {
    const [spawn] = parseEffectStages(
      JSON.stringify([{ role: 'spawn', kind: 'burst', durationMs: 100, branches: 99, spreadDeg: 999 }])
    );

    expect(spawn.branches).toBe(MAX_BRANCHES);
    expect(spawn.spreadDeg).toBe(360);
  });

  it('lets no branch spawn again', () => {
    // One level is what can be read on the board, and what can be drawn.
    const [spawn] = parseEffectStages(
      JSON.stringify([
        {
          role: 'spawn',
          kind: 'burst',
          durationMs: 100,
          children: [{ role: 'spawn', kind: 'burst', durationMs: 100 }],
        },
      ])
    );

    expect(spawn.children?.[0].role).toBe('impact');
  });

  it('keeps the colours and the size a stage was given', () => {
    const [read] = parseEffectStages(
      JSON.stringify([{ role: 'impact', kind: 'frost', durationMs: 400, scale: 2, grade: 3, colorPrimary: '#fff' }])
    );

    expect(read).toMatchObject({ scale: 2, grade: 3, colorPrimary: '#fff' });
  });
});

describe('encodeEffectStages()', () => {
  it('writes nothing for no stages', () => {
    expect(encodeEffectStages([])).toBe('');
  });

  it('writes no more than one effect may run', () => {
    const many = Array.from({ length: MAX_STAGES + 2 }, () => stage());

    expect(JSON.parse(encodeEffectStages(many))).toHaveLength(MAX_STAGES);
  });
});
