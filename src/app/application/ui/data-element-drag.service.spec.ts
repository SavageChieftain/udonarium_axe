import { TestBed } from '@angular/core/testing';
import { DataElementDragService } from '@axe/application/ui/data-element-drag.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('DataElementDragService', () => {
  const MIME = 'application/x-udonarium-data-element';

  function dropOf(data: Record<string, string>): DragEvent {
    return {
      dataTransfer: {
        types: Object.keys(data),
        getData: (type: string) => data[type] ?? '',
        setData: () => undefined,
      },
    } as unknown as DragEvent;
  }

  function service(): DataElementDragService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    return TestBed.inject(DataElementDragService);
  }

  it('reads a card dragged from within the sheet', () => {
    expect(service().getDraggedId(dropOf({ [MIME]: 'element-1', 'text/plain': 'element-1' }))).toBe('element-1');
  });

  it('takes what is being dragged now over anything the drop carries', () => {
    const drag = service();
    drag.start({ dataTransfer: { setData: () => undefined } } as unknown as DragEvent, 'element-9');

    expect(drag.getDraggedId(dropOf({ 'text/plain': 'element-1' }))).toBe('element-9');
  });

  it('claims nothing of a drag that came from outside the page', () => {
    expect(service().getDraggedId(dropOf({ 'text/plain': 'https://example.com/picture.png' }))).toBeNull();
    expect(service().getDraggedId(dropOf({ 'text/uri-list': 'https://example.com/picture.png' }))).toBeNull();
    expect(service().getDraggedId(dropOf({ Files: '' }))).toBeNull();
  });

  it('claims nothing of a drop carrying nothing at all', () => {
    expect(service().getDraggedId(undefined)).toBeNull();
    expect(service().getDraggedId({} as DragEvent)).toBeNull();
  });
});
