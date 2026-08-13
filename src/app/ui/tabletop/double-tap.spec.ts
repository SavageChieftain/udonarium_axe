import { DoubleTap } from '@axe/ui/tabletop/double-tap';

function input(x = 0, y = 0) {
  return { pointer: { x, y }, onEnd: null as ((event: MouseEvent | TouchEvent) => void) | null };
}

const mouse = new MouseEvent('mousedown');
const touch = { touches: [{}] } as unknown as TouchEvent;

describe('DoubleTap', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('1 度目では何も起こさないこと', () => {
    const tap = new DoubleTap(() => input());
    const run = vi.fn();

    tap.handle(mouse, run);

    expect(run).not.toHaveBeenCalled();
  });

  it('マウスの 2 度目はその場で効かせること', () => {
    const tap = new DoubleTap(() => input());
    const run = vi.fn();

    tap.handle(mouse, run);
    tap.handle(mouse, run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('指の 2 度目は離すまで待つこと', () => {
    // 押した瞬間に効かせると、めくるつもりで置いた指がそのまま移動になる。
    const held = input();
    const tap = new DoubleTap(() => held);
    const run = vi.fn();

    tap.handle(touch, run);
    tap.handle(touch, run);
    expect(run).not.toHaveBeenCalled();

    held.onEnd?.(touch);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('間が空いたら 1 度目に戻ること', () => {
    const tap = new DoubleTap(() => input());
    const run = vi.fn();

    tap.handle(mouse, run);
    vi.advanceTimersByTime(301);
    tap.handle(mouse, run);

    expect(run).not.toHaveBeenCalled();
  });

  it('指のほうが待つ間を長く取ること', () => {
    // マウスなら間に合わない間隔でも、指はまだ 2 度目として拾う。
    const held = input();
    const tap = new DoubleTap(() => held);
    const run = vi.fn();

    tap.handle(touch, run);
    vi.advanceTimersByTime(301);
    tap.handle(touch, run);
    held.onEnd?.(touch);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('離れた場所での 2 度目は同じ場所と見なさないこと', () => {
    const held = input(0, 0);
    const tap = new DoubleTap(() => held);

    tap.handle(mouse, () => undefined);
    held.pointer = { x: 40, y: 0 };

    expect(tap.isInPlace()).toBe(false);
  });

  it('わずかな指のぶれは同じ場所と見なすこと', () => {
    const held = input(0, 0);
    const tap = new DoubleTap(() => held);

    tap.handle(mouse, () => undefined);
    held.pointer = { x: 3, y: 3 };

    expect(tap.isInPlace()).toBe(true);
  });

  it('取り消すと待ち受けも解くこと', () => {
    const held = input();
    const tap = new DoubleTap(() => held);
    const run = vi.fn();

    tap.handle(touch, run);
    tap.handle(touch, run);
    tap.cancel();

    expect(held.onEnd).toBeNull();
  });
});
