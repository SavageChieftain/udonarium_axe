import { observeTap, TapPoint } from '@axe/core/input/tap-gesture';

function touchEvent(type: string, x: number, y: number, count = 1): Event {
  const event = new Event(type, { bubbles: true });
  const touch = { clientX: x, clientY: y };
  const list = Array.from({ length: count }, () => touch);
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : list });
  Object.defineProperty(event, 'changedTouches', { value: [touch] });
  return event;
}

describe('observeTap', () => {
  let element: HTMLElement;
  let taps: TapPoint[];

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    taps = [];
  });

  afterEach(() => {
    element.remove();
  });

  it('動かない短いタッチをタップとして通知する', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchend', 11, 21));

    expect(taps).toEqual([{ x: 11, y: 21 }]);
    handle.destroy();
  });

  it('大きく動いたらタップにしない', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchmove', 60, 20));
    element.dispatchEvent(touchEvent('touchend', 60, 20));

    expect(taps).toEqual([]);
    handle.destroy();
  });

  it('複数本の指はタップにしない', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20, 2));
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
    handle.destroy();
  });

  it('長押しはタップにしない', () => {
    vi.useFakeTimers();
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    vi.advanceTimersByTime(400);
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
    handle.destroy();
    vi.useRealTimers();
  });

  it('タップの上限は長押しの成立より短い', () => {
    vi.useFakeTimers();
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    vi.advanceTimersByTime(299);
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toHaveLength(1);
    handle.destroy();
    vi.useRealTimers();
  });

  it('touchcancel の後はタップにしない', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchcancel', 10, 20));
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
    handle.destroy();
  });

  it('破棄した後は通知しない', () => {
    const handle = observeTap(element, (point) => taps.push(point));
    handle.destroy();

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
  });
});
