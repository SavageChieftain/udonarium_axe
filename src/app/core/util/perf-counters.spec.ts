import { perfCounters } from '@axe/core/util/perf-counters';

describe('perfCounters', () => {
  beforeEach(() => {
    perfCounters.enabled = false;
    perfCounters.clear();
  });

  afterEach(() => {
    perfCounters.enabled = false;
    perfCounters.clear();
  });

  it('counts nothing while nobody is watching', () => {
    perfCounters.bump('a');
    perfCounters.bump('a');

    expect(perfCounters.drain().size).toBe(0);
  });

  it('counts each key separately once watching', () => {
    perfCounters.enabled = true;
    perfCounters.bump('a');
    perfCounters.bump('a');
    perfCounters.bump('b');

    const reading = perfCounters.drain();

    expect(reading.get('a')).toBe(2);
    expect(reading.get('b')).toBe(1);
  });

  it('starts a fresh count once the last one has been read', () => {
    perfCounters.enabled = true;
    perfCounters.bump('a');
    perfCounters.drain();
    perfCounters.bump('a');

    expect(perfCounters.drain().get('a')).toBe(1);
  });
});
