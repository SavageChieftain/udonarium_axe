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

  it('触るまでは出したままにすること', () => {
    expect(hideIconWhileTouched(destroyRef().ref).isHidden()).toBe(false);
  });

  it('触っているあいだは隠すこと', () => {
    const hiding = hideIconWhileTouched(destroyRef().ref);

    hiding.touch();

    expect(hiding.isHidden()).toBe(true);
  });

  it('触り終えてしばらくしてから戻すこと', () => {
    const hiding = hideIconWhileTouched(destroyRef().ref);

    hiding.touch();
    vi.advanceTimersByTime(299);
    expect(hiding.isHidden()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(hiding.isHidden()).toBe(false);
  });

  it('触り続けているあいだは戻さないこと', () => {
    // 動かしている最中に戻ると、狙っている駒がアイコンで隠れてちらつく。
    const hiding = hideIconWhileTouched(destroyRef().ref);

    hiding.touch();
    vi.advanceTimersByTime(200);
    hiding.touch();
    vi.advanceTimersByTime(200);

    expect(hiding.isHidden()).toBe(true);
  });

  it('片付けたあとに戻さないこと', () => {
    const { ref, destroy } = destroyRef();
    const hiding = hideIconWhileTouched(ref);

    hiding.touch();
    destroy();
    vi.advanceTimersByTime(1000);

    expect(hiding.isHidden()).toBe(true);
  });
});
