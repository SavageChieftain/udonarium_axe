import { spotBeside } from '@axe/ui/panel-spot';

describe('placing a panel beside the control it was opened from', () => {
  const size = { width: 380, height: 520 };
  const viewport = { width: 1280, height: 800 };

  it('puts it above the control, centred on it', () => {
    const spot = spotBeside({ left: 600, top: 700, right: 644, bottom: 744 }, size, viewport);

    expect(spot).toEqual({ left: 432, top: 172 });
  });

  it('drops it below where there is no room above', () => {
    const spot = spotBeside({ left: 600, top: 40, right: 644, bottom: 84 }, size, viewport);

    expect(spot.top).toBe(92);
  });

  it('keeps it on screen at either edge', () => {
    const left = spotBeside({ left: 0, top: 700, right: 44, bottom: 744 }, size, viewport);
    const right = spotBeside({ left: 1236, top: 700, right: 1280, bottom: 744 }, size, viewport);

    expect(left.left).toBe(8);
    expect(right.left).toBe(892);
  });

  it('settles at the margin on a screen smaller than the panel', () => {
    const spot = spotBeside({ left: 10, top: 10, right: 54, bottom: 54 }, size, { width: 300, height: 300 });

    expect(spot).toEqual({ left: 8, top: 8 });
  });
});
