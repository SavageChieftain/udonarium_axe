import { TestBed } from '@angular/core/testing';

import { BatchService } from './batch.service';

// setZeroTimeout は MessageChannel ベースで fake timer では発火しない。
// setInterval(66) は fake timer で制御できるので、それを使ってテストする。

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

  it('addしたタスクが66msバッチで実行される', () => {
    const spy = vi.fn();
    service.add(spy);

    vi.advanceTimersByTime(66);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('同一キーで追加すると後のタスクで上書きされる', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const key = 'unique-key';

    service.add(spy1, key);
    service.add(spy2, key);

    vi.advanceTimersByTime(66);

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('removeでキーのタスクを除去できる', () => {
    const spy = vi.fn();
    const key = 'remove-key';

    service.add(spy, key);
    service.remove(key);

    vi.advanceTimersByTime(66);

    expect(spy).not.toHaveBeenCalled();
  });

  it('複数のタスクをバッチで同時実行する', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    service.add(spy1, 'a');
    service.add(spy2, 'b');

    vi.advanceTimersByTime(66);

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('バッチ実行後にタスクマップがクリアされる', () => {
    const spy = vi.fn();
    service.add(spy);

    vi.advanceTimersByTime(66);
    expect(spy).toHaveBeenCalledTimes(1);

    // インターバルが残っていてもタスクがなければ再実行されない
    vi.advanceTimersByTime(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
