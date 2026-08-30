import {
  BUFF_VIEW_LABEL_KEYS,
  BUFF_VIEW_MODES,
  type BuffViewMode,
  isBuffViewMode,
  nextBuffViewMode,
} from '@axe/domain/character/buff-view-mode';

describe('buff-view-mode', () => {
  it('walks the modes in the order they are offered', () => {
    expect(nextBuffViewMode('icon')).toBe('detail');
    expect(nextBuffViewMode('detail')).toBe('count');
  });

  it('comes back round to the first', () => {
    expect(nextBuffViewMode('count')).toBe('icon');
  });

  it('takes as many steps as there are modes to come back to where it started', () => {
    let mode: BuffViewMode = 'icon';
    for (const _ of BUFF_VIEW_MODES) mode = nextBuffViewMode(mode);
    expect(mode).toBe('icon');
  });

  it('falls back to the first from a mode it does not know', () => {
    expect(nextBuffViewMode('nonsense' as BuffViewMode)).toBe('icon');
  });

  it('knows one of its own from anything else', () => {
    expect(isBuffViewMode('detail')).toBe(true);
    expect(isBuffViewMode('nonsense')).toBe(false);
    expect(isBuffViewMode(null)).toBe(false);
  });

  it('names every mode it offers', () => {
    for (const mode of BUFF_VIEW_MODES) expect(BUFF_VIEW_LABEL_KEYS[mode]).toMatch(/^feature\.character\.buff\.view/);
  });
});
