import { type EffectStage, MAX_STAGES } from '@axe/domain/effect/effect-stage';
import {
  addBranchStage,
  addStage,
  kindsForRole,
  moveStage,
  removeBranchStage,
  removeStage,
  updateBranchStage,
  updateStage,
} from '@axe/domain/effect/effect-stage-form';

function run(): EffectStage[] {
  return addStage(addStage([], 'travel'), 'impact');
}

describe('kindsForRole()', () => {
  it('offers what travels only where something runs from somewhere', () => {
    expect(kindsForRole('travel')).toContain('projectile');
    expect(kindsForRole('travel')).not.toContain('burst');
  });

  it('offers what happens about the target everywhere else', () => {
    expect(kindsForRole('impact')).toContain('burst');
    expect(kindsForRole('field')).toContain('flame');
  });
});

describe('addStage()', () => {
  it('adds a stage of the role it was asked for', () => {
    expect(addStage([], 'travel')[0]).toMatchObject({ role: 'travel', kind: 'projectile' });
  });

  it('gives a spawn something to throw', () => {
    const [spawn] = addStage([], 'spawn');

    expect(spawn.branches).toBe(3);
    expect(spawn.children).toHaveLength(1);
  });

  it('adds no more than one effect may run', () => {
    let stages: EffectStage[] = [];
    for (let index = 0; index < MAX_STAGES + 3; index++) stages = addStage(stages, 'impact');

    expect(stages).toHaveLength(MAX_STAGES);
  });

  it('leaves the list it was given alone', () => {
    const stages = run();

    addStage(stages, 'impact');

    expect(stages).toHaveLength(2);
  });
});

describe('moveStage()', () => {
  it('moves a stage down the run', () => {
    const moved = moveStage(run(), 0, 1);

    expect(moved.map((stage) => stage.role)).toEqual(['impact', 'travel']);
  });

  it('moves nothing past either end', () => {
    expect(moveStage(run(), 0, -1).map((stage) => stage.role)).toEqual(['travel', 'impact']);
    expect(moveStage(run(), 1, 1).map((stage) => stage.role)).toEqual(['travel', 'impact']);
  });
});

describe('removeStage()', () => {
  it('takes one out', () => {
    expect(removeStage(run(), 0).map((stage) => stage.role)).toEqual(['impact']);
  });

  it('takes nothing out for a place that is not there', () => {
    expect(removeStage(run(), 9)).toHaveLength(2);
  });
});

describe('updateStage()', () => {
  it('writes what it was given', () => {
    const stages = updateStage(run(), 1, { durationMs: 900, grade: 3 });

    expect(stages[1]).toMatchObject({ durationMs: 900, grade: 3 });
  });

  it('puts the look back where it no longer suits the role', () => {
    // A look that travels has nowhere to run once the stage lands instead.
    const stages = updateStage(addStage([], 'travel'), 0, { role: 'impact' });

    expect(stages[0].kind).toBe('burst');
  });

  it('keeps nothing of what a stage threw once it stops throwing', () => {
    const stages = updateStage(addStage([], 'spawn'), 0, { role: 'impact' });

    expect(stages[0].children).toBeUndefined();
    expect(stages[0].branches).toBeUndefined();
  });

  it('gives a stage something to throw once it starts throwing', () => {
    const stages = updateStage(addStage([], 'impact'), 0, { role: 'spawn' });

    expect(stages[0].children).toHaveLength(1);
  });
});

describe('what a spawn throws', () => {
  it('adds a stage to the chain each branch follows', () => {
    const stages = addBranchStage(addStage([], 'spawn'), 0, 'travel');

    expect(stages[0].children?.map((child) => child.role)).toEqual(['impact', 'travel']);
  });

  it('lets no branch throw again', () => {
    const stages = addBranchStage(addStage([], 'spawn'), 0, 'spawn');

    expect(stages[0].children?.[1].role).toBe('impact');
  });

  it('writes onto one of them without changing its role', () => {
    const stages = updateBranchStage(addStage([], 'spawn'), 0, 0, { durationMs: 800, role: 'spawn' });

    expect(stages[0].children?.[0]).toMatchObject({ role: 'impact', durationMs: 800 });
  });

  it('takes one out', () => {
    const stages = removeBranchStage(addStage([], 'spawn'), 0, 0);

    expect(stages[0].children).toEqual([]);
  });

  it('leaves a stage that throws nothing alone', () => {
    const stages = addBranchStage(addStage([], 'impact'), 0, 'impact');

    expect(stages[0].children).toBeUndefined();
  });
});
