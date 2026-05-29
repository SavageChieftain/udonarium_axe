import {
  MARQUEE_MOUSE_LONG_PRESS_MS,
  MARQUEE_MOVE_CANCEL_THRESHOLD_PX,
  MARQUEE_TOUCH_LONG_PRESS_MS,
  MarqueeModifiers,
  MarqueePoint,
  MarqueeRect,
  TableMarqueeGesture,
} from '@axe/features/tabletop/game-table/table-marquee-gesture';

const identityScreenToTable = (x: number, y: number): MarqueePoint => ({ x, y });

function makeEvent(
  opts: {
    button?: number;
    clientX?: number;
    clientY?: number;
    pointerType?: string;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
    alt?: boolean;
  } = {}
): PointerEvent {
  return {
    button: opts.button ?? 0,
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    pageX: opts.clientX ?? 0,
    pageY: opts.clientY ?? 0,
    pointerType: opts.pointerType ?? 'mouse',
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    metaKey: opts.meta ?? false,
    altKey: opts.alt ?? false,
  } as unknown as PointerEvent;
}

describe('TableMarqueeGesture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arm でマウスの長押しタイマーが起動し、時間経過で onMarqueeStart が発火する', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const start = vi.fn<(p: MarqueePoint, m: MarqueeModifiers) => void>();
    gesture.onMarqueeStart = start;

    const armed = gesture.arm(makeEvent({ clientX: 10, clientY: 20 }));
    expect(armed).toBe(true);
    expect(gesture.isArmed).toBe(true);
    expect(gesture.isActive).toBe(false);

    vi.advanceTimersByTime(MARQUEE_MOUSE_LONG_PRESS_MS);

    expect(gesture.isActive).toBe(true);
    expect(start).toHaveBeenCalledWith({ x: 10, y: 20 }, { shift: false, ctrl: false });
  });

  it('タッチ系では 500ms の長押しが必要', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const start = vi.fn();
    gesture.onMarqueeStart = start;

    gesture.arm(makeEvent({ pointerType: 'touch' }));
    vi.advanceTimersByTime(MARQUEE_MOUSE_LONG_PRESS_MS);
    expect(start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MARQUEE_TOUCH_LONG_PRESS_MS - MARQUEE_MOUSE_LONG_PRESS_MS);
    expect(start).toHaveBeenCalled();
  });

  it('button !== 0 では arm されない', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    expect(gesture.arm(makeEvent({ button: 2 }))).toBe(false);
    expect(gesture.isArmed).toBe(false);
  });

  it('Ctrl/Meta/Alt 押下時は arm されない', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    expect(gesture.arm(makeEvent({ ctrl: true }))).toBe(false);
    expect(gesture.arm(makeEvent({ meta: true }))).toBe(false);
    expect(gesture.arm(makeEvent({ alt: true }))).toBe(false);
  });

  it('閾値を超える移動で arm がキャンセルされる', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const start = vi.fn();
    gesture.onMarqueeStart = start;
    gesture.arm(makeEvent({ clientX: 0, clientY: 0 }));

    gesture.updatePointer(MARQUEE_MOVE_CANCEL_THRESHOLD_PX + 1, 0);
    expect(gesture.isArmed).toBe(false);

    vi.advanceTimersByTime(MARQUEE_MOUSE_LONG_PRESS_MS);
    expect(start).not.toHaveBeenCalled();
  });

  it('発火後の updatePointer は onMarqueeUpdate を呼ぶ', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const update = vi.fn();
    gesture.onMarqueeUpdate = update;
    gesture.arm(makeEvent({ clientX: 10, clientY: 20 }));
    vi.advanceTimersByTime(MARQUEE_MOUSE_LONG_PRESS_MS);

    gesture.updatePointer(50, 80);
    expect(update).toHaveBeenCalledWith({ x: 50, y: 80 });
  });

  it('release で onMarqueeEnd が rect とリリース時 modifiers を渡して発火する', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const end = vi.fn<(r: MarqueeRect, m: MarqueeModifiers) => void>();
    gesture.onMarqueeEnd = end;
    gesture.arm(makeEvent({ clientX: 10, clientY: 20 }));
    vi.advanceTimersByTime(MARQUEE_MOUSE_LONG_PRESS_MS);
    gesture.updatePointer(50, 80);

    const released = gesture.release(makeEvent({ shift: true }));
    expect(released).toBe(true);
    expect(end).toHaveBeenCalledWith({ x1: 10, y1: 20, x2: 50, y2: 80 }, { shift: true, ctrl: false });
    expect(gesture.isActive).toBe(false);
  });

  it('未発火の release は何もしない', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const end = vi.fn();
    gesture.onMarqueeEnd = end;
    gesture.arm(makeEvent());

    expect(gesture.release(makeEvent())).toBe(false);
    expect(end).not.toHaveBeenCalled();
    expect(gesture.isArmed).toBe(false);
  });

  it('cancel でタイマーが止まり、後の発火もない', () => {
    const gesture = new TableMarqueeGesture(identityScreenToTable);
    const start = vi.fn();
    gesture.onMarqueeStart = start;
    gesture.arm(makeEvent());
    gesture.cancel();
    vi.advanceTimersByTime(MARQUEE_MOUSE_LONG_PRESS_MS);
    expect(start).not.toHaveBeenCalled();
  });
});
