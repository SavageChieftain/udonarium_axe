import { allCleared, fogClipPath, fogClipRuns } from '@axe/ui/tabletop/fog-clip';
import { describe, expect, it } from 'vitest';

describe('fogClipRuns', () => {
  it('gathers neighbouring cleared cells into one rectangle', () => {
    expect(fogClipRuns([true, true, false, true], 50, 0, 100)).toEqual([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 150, y: 0, width: 50, height: 100 },
    ]);
  });

  it('closes a run that reaches the end', () => {
    expect(fogClipRuns([false, true, true], 50, 20, 30)).toEqual([{ x: 50, y: 20, width: 100, height: 30 }]);
  });

  it('gives nothing for a row nobody has walked to', () => {
    expect(fogClipRuns([false, false], 50, 0, 100)).toEqual([]);
  });
});

describe('fogClipPath', () => {
  it('draws one closed rectangle per run', () => {
    expect(fogClipPath([{ x: 0, y: 0, width: 100, height: 50 }])).toBe('path("M 0 0 H 100 V 50 H 0 Z")');
  });

  it('holds several runs in the one path', () => {
    const css = fogClipPath([
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 100, y: 0, width: 50, height: 50 },
    ]);
    expect(css).toBe('path("M 0 0 H 50 V 50 H 0 Z M 100 0 H 150 V 50 H 100 Z")');
  });

  it('cuts everything away when nothing is left standing', () => {
    expect(fogClipPath([])).toBe('path("M 0 0 Z")');
  });

  it('drops a rectangle with no room in it', () => {
    expect(fogClipPath([{ x: 0, y: 0, width: 0, height: 50 }])).toBe('path("M 0 0 Z")');
  });
});

describe('allCleared', () => {
  it('is true only when every cell has been walked to', () => {
    expect(allCleared([true, true])).toBe(true);
    expect(allCleared([true, false])).toBe(false);
    expect(allCleared([])).toBe(true);
  });
});
