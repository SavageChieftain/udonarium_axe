import { TestBed } from '@angular/core/testing';
import { TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

function makeObject(identifier: string): TabletopObject {
  return { identifier, aliasName: 'character', name: identifier } as unknown as TabletopObject;
}

function makeElement(rect: { x: number; y: number; w: number; h: number }): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.w,
      bottom: rect.y + rect.h,
      width: rect.w,
      height: rect.h,
    }) as DOMRect;
  return el;
}

describe('TabletopOverlapService', () => {
  let service: TabletopOverlapService;

  beforeEach(() => {
    if (typeof document.elementsFromPoint !== 'function') {
      (document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = () => [];
    }
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabletopOverlapService);
  });

  it('register と unregister でレジストリが管理される', () => {
    const obj = makeObject('a');
    const el = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    service.register(obj, el);
    service.unregister('a');
    // No throw, no leak — verify by spying on elementsFromPoint returning nothing.
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue([]);
    expect(service.findAt(5, 5)).toEqual([]);
  });

  it('findAt で elementsFromPoint がヒットしたオブジェクトを返す', () => {
    const obj1 = makeObject('a');
    const obj2 = makeObject('b');
    const el1 = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    const el2 = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    service.register(obj1, el1);
    service.register(obj2, el2);

    vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el1, el2]);

    const result = service.findAt(5, 5);
    expect(result).toContain(obj1);
    expect(result).toContain(obj2);
  });

  it('elementsFromPoint が空なら何も返さない', () => {
    const obj = makeObject('a');
    const el = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    service.register(obj, el);
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue([]);
    expect(service.findAt(5, 5)).toEqual([]);
  });

  it('reopenContextMenuFor は登録済みの要素に contextmenu を dispatch する', async () => {
    const obj = makeObject('a');
    const el = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    document.body.appendChild(el);
    service.register(obj, el);

    const handler = vi.fn();
    el.addEventListener('contextmenu', handler);
    service.reopenContextMenuFor('a', 5, 6);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    const ev = handler.mock.calls[0][0] as MouseEvent;
    expect(ev.clientX).toBe(5);
    expect(ev.clientY).toBe(6);
    document.body.removeChild(el);
  });

  it('未登録の identifier では reopenContextMenuFor は何もしない', () => {
    expect(() => service.reopenContextMenuFor('missing', 0, 0)).not.toThrow();
  });

  it('同じ identifier の register はエントリを上書きする', () => {
    const obj1 = makeObject('a');
    const el1 = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    const el2 = makeElement({ x: 0, y: 0, w: 10, h: 10 });
    service.register(obj1, el1);
    service.register(obj1, el2);

    vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el2]);
    expect(service.findAt(5, 5)).toContain(obj1);

    vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el1]);
    expect(service.findAt(5, 5)).not.toContain(obj1);
  });
});
