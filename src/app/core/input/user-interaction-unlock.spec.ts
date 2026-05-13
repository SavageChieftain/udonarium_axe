import { onFirstUserInteraction } from '@axe/core/input/user-interaction-unlock';

describe('onFirstUserInteraction', () => {
  it('mousedown で callback が呼ばれ、以後は解除される', () => {
    const cb = vi.fn();
    onFirstUserInteraction(cb);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(cb).toHaveBeenCalledTimes(1);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('touchstart でも callback が呼ばれる', () => {
    const cb = vi.fn();
    onFirstUserInteraction(cb);

    document.body.dispatchEvent(new Event('touchstart', { bubbles: true }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('返却された解除関数を呼ぶと callback は走らない', () => {
    const cb = vi.fn();
    const unsubscribe = onFirstUserInteraction(cb);

    unsubscribe();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(cb).not.toHaveBeenCalled();
  });
});
