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

  it('reports a short, still touch as a tap', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchend', 11, 21));

    expect(taps).toEqual([{ x: 11, y: 21 }]);
    handle.destroy();
  });

  it('is no tap once the finger has travelled', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchmove', 60, 20));
    element.dispatchEvent(touchEvent('touchend', 60, 20));

    expect(taps).toEqual([]);
    handle.destroy();
  });

  it('is no tap under several fingers', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20, 2));
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
    handle.destroy();
  });

  it('is no tap once it becomes a press', () => {
    vi.useFakeTimers();
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    vi.advanceTimersByTime(400);
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
    handle.destroy();
    vi.useRealTimers();
  });

  it('the tap window closes before the press begins', () => {
    vi.useFakeTimers();
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    vi.advanceTimersByTime(299);
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toHaveLength(1);
    handle.destroy();
    vi.useRealTimers();
  });

  it('is no tap after the touch is cancelled', () => {
    const handle = observeTap(element, (point) => taps.push(point));

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchcancel', 10, 20));
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
    handle.destroy();
  });

  it('reports nothing after teardown', () => {
    const handle = observeTap(element, (point) => taps.push(point));
    handle.destroy();

    element.dispatchEvent(touchEvent('touchstart', 10, 20));
    element.dispatchEvent(touchEvent('touchend', 10, 20));

    expect(taps).toEqual([]);
  });
});
