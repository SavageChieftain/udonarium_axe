import { HotbarSlotDrag } from '@axe/features/hotbar/hotbar-drag';

describe('a press on a slot on its way to becoming a drag', () => {
  let drag: HotbarSlotDrag;

  beforeEach(() => {
    drag = new HotbarSlotDrag();
  });

  it('carries nothing until the press has travelled far enough', () => {
    drag.press(1, { x: 0, y: 0 });
    expect(drag.carrying).toBeNull();

    drag.move({ x: 3, y: 2 });
    expect(drag.carrying).toBeNull();

    drag.move({ x: 8, y: 0 });
    expect(drag.carrying).toBe(1);
  });

  it('lets go of nothing where the press never became a drag', () => {
    drag.press(1, { x: 0, y: 0 });
    drag.move({ x: 2, y: 1 });

    expect(drag.release()).toBeNull();
    expect(drag.takeDrop()).toBe(false);
  });

  it('lets go of the slot it carried, and says the click that follows is the drop', () => {
    drag.press(2, { x: 0, y: 0 });
    drag.move({ x: 30, y: 0 });

    expect(drag.release()).toBe(2);
    expect(drag.takeDrop()).toBe(true);
    expect(drag.takeDrop()).toBe(false);
  });

  it('forgets a drop nobody answered, so the next press is a press', () => {
    drag.press(2, { x: 0, y: 0 });
    drag.move({ x: 30, y: 0 });
    drag.release();

    drag.press(3, { x: 0, y: 0 });

    expect(drag.takeDrop()).toBe(false);
  });

  it('stays lifted once it is lifted, however the pointer wanders back', () => {
    drag.press(0, { x: 0, y: 0 });
    drag.move({ x: 30, y: 0 });
    drag.move({ x: 1, y: 0 });

    expect(drag.carrying).toBe(0);
  });
});
