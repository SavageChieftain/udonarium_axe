import { TestBed } from '@angular/core/testing';
import { BatchService } from '@axe/application/ui/batch.service';

// setZeroTimeout runs on a MessageChannel and never fires under fake timers,
// so these tests drive the 66ms interval, which fake timers can control.

describe('BatchService', () => {
  let service: BatchService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BatchService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('runs an added task in the next batch', () => {
    const spy = vi.fn();
    service.add(spy);

    vi.advanceTimersByTime(66);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('replaces a task added again under the same key', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const key = 'unique-key';

    service.add(spy1, key);
    service.add(spy2, key);

    vi.advanceTimersByTime(66);

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('removes a task by key', () => {
    const spy = vi.fn();
    const key = 'remove-key';

    service.add(spy, key);
    service.remove(key);

    vi.advanceTimersByTime(66);

    expect(spy).not.toHaveBeenCalled();
  });

  it('runs several tasks together in one batch', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    service.add(spy1, 'a');
    service.add(spy2, 'b');

    vi.advanceTimersByTime(66);

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('empties the task map after a batch', () => {
    const spy = vi.fn();
    service.add(spy);

    vi.advanceTimersByTime(66);
    expect(spy).toHaveBeenCalledTimes(1);

    // does nothing more once the tasks are gone, interval or not
    vi.advanceTimersByTime(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
