import { TestBed } from '@angular/core/testing';
import { RenderStatsService } from '@axe/application/ui/render-stats.service';
import { perfCounters } from '@axe/core/util/perf-counters';

describe('RenderStatsService', () => {
  let service: RenderStatsService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [RenderStatsService] });
    service = TestBed.inject(RenderStatsService);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('leaves the counters off until somebody opens the panel', () => {
    expect(perfCounters.enabled).toBe(false);

    service.start();

    expect(perfCounters.enabled).toBe(true);
  });

  it('reads back what was counted over the last second', () => {
    service.start();
    perfCounters.bump('visionScene');
    perfCounters.bump('visionScene');
    perfCounters.bump('visionScene');

    vi.advanceTimersByTime(1000);

    expect(service.stats().counters.get('visionScene')).toBe(3);
  });

  it('counts the next second on its own', () => {
    service.start();
    perfCounters.bump('visionScene');
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);

    expect(service.stats().counters.get('visionScene')).toBeUndefined();
  });

  it('stops counting when the panel is closed', () => {
    service.start();
    service.stop();

    expect(perfCounters.enabled).toBe(false);
    expect(service.watching()).toBe(false);
  });

  it('counts the terrain the table is showing', () => {
    const table = document.createElement('div');
    table.id = 'app-game-table';
    table.innerHTML = '<terrain><div><canvas></canvas></div></terrain><terrain><div></div></terrain>';
    document.body.appendChild(table);

    service.start();
    vi.advanceTimersByTime(1000);

    expect(service.stats().terrains).toBe(2);
    expect(service.stats().terrainCanvases).toBe(1);

    table.remove();
  });
});
