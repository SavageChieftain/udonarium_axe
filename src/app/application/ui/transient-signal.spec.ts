import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { transientSignal } from '@axe/application/ui/transient-signal';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class HostComponent {
  readonly notice = transientSignal('', 500);
}

describe('transientSignal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function host() {
    return TestBed.createComponent(HostComponent);
  }

  it('rests until shown, and comes to rest again after the hold', () => {
    const { notice } = host().componentInstance;
    expect(notice()).toBe('');
    notice.show('saved');
    expect(notice()).toBe('saved');
    vi.advanceTimersByTime(499);
    expect(notice()).toBe('saved');
    vi.advanceTimersByTime(1);
    expect(notice()).toBe('');
  });

  it('starts the hold over when shown again', () => {
    const { notice } = host().componentInstance;
    notice.show('first');
    vi.advanceTimersByTime(400);
    notice.show('second');
    vi.advanceTimersByTime(400);
    expect(notice()).toBe('second');
    vi.advanceTimersByTime(100);
    expect(notice()).toBe('');
  });

  it('takes a hold of its own for one showing', () => {
    const { notice } = host().componentInstance;
    notice.show('long', 2000);
    vi.advanceTimersByTime(1999);
    expect(notice()).toBe('long');
    vi.advanceTimersByTime(1);
    expect(notice()).toBe('');
  });

  it('clears at once when asked', () => {
    const { notice } = host().componentInstance;
    notice.show('gone');
    notice.clear();
    expect(notice()).toBe('');
  });

  it('lets go of its timer with the host', () => {
    const fixture = host();
    const { notice } = fixture.componentInstance;
    notice.show('late');
    fixture.destroy();
    vi.advanceTimersByTime(1000);
    expect(notice()).toBe('late');
  });
});
