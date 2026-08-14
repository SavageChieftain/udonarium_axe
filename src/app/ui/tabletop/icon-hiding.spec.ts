import { DestroyRef } from '@angular/core';
import { hideIconWhileTouched } from '@axe/ui/tabletop/icon-hiding';

function destroyRef(): { ref: DestroyRef; destroy: () => void } {
  const callbacks: (() => void)[] = [];
  return {
    ref: { onDestroy: (fn: () => void) => callbacks.push(fn) } as unknown as DestroyRef,
    destroy: () => callbacks.forEach((fn) => fn()),
  };
}

describe('hideIconWhileTouched()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('leaves the icon showing until the piece is touched', () => {
    expect(hideIconWhileTouched(destroyRef().ref).isHidden()).toBe(false);
  });

  it('hides it while the piece is touched', () => {
    const hiding = hideIconWhileTouched(destroyRef().ref);

    hiding.touch();

    expect(hiding.isHidden()).toBe(true);
  });

  it('brings it back a moment after the touch ends', () => {
    const hiding = hideIconWhileTouched(destroyRef().ref);

    hiding.touch();
    vi.advanceTimersByTime(299);
    expect(hiding.isHidden()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(hiding.isHidden()).toBe(false);
  });

  it('keeps it hidden while the touch continues', () => {
    // Bringing it back mid-drag would flicker over the piece being aimed at.
    const hiding = hideIconWhileTouched(destroyRef().ref);

    hiding.touch();
    vi.advanceTimersByTime(200);
    hiding.touch();
    vi.advanceTimersByTime(200);

    expect(hiding.isHidden()).toBe(true);
  });

  it('does not bring it back after teardown', () => {
    const { ref, destroy } = destroyRef();
    const hiding = hideIconWhileTouched(ref);

    hiding.touch();
    destroy();
    vi.advanceTimersByTime(1000);

    expect(hiding.isHidden()).toBe(true);
  });
});
