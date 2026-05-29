import { TestBed } from '@angular/core/testing';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';

describe('SelectionSignalService', () => {
  let service: SelectionSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectionSignalService);
  });

  it('初期状態ではselectedObjectがnull', () => {
    expect(service.selectedObject()).toBeNull();
  });

  it('初期状態ではhighlightedObjectがnull', () => {
    expect(service.highlightedObject()).toBeNull();
  });

  it('初期状態ではfocusCoordinateがnull', () => {
    expect(service.focusCoordinate()).toBeNull();
  });

  it('selectObjectでselectedObjectが更新される', () => {
    service.selectObject('test-id', 'GameCharacter');

    const result = service.selectedObject();
    expect(result).toEqual({ identifier: 'test-id', className: 'GameCharacter' });
  });

  it('highlightObjectでhighlightedObjectが更新される', () => {
    service.highlightObject('highlight-id');

    const result = service.highlightedObject();
    expect(result).not.toBeNull();
    expect(result!.identifier).toBe('highlight-id');
    expect(result!.timestamp).toBeGreaterThan(0);
  });

  it('focusToCoordinateでfocusCoordinateが更新される', () => {
    service.focusToCoordinate(100, 200);

    const result = service.focusCoordinate();
    expect(result).not.toBeNull();
    expect(result!.x).toBe(100);
    expect(result!.y).toBe(200);
    expect(result!.timestamp).toBeGreaterThan(0);
  });

  it('highlightObjectを連続で呼ぶとtimestampが異なる', async () => {
    service.highlightObject('id-1');
    const first = service.highlightedObject();

    await new Promise((resolve) => setTimeout(resolve, 5));

    service.highlightObject('id-1');
    const second = service.highlightedObject();

    expect(second!.timestamp).toBeGreaterThanOrEqual(first!.timestamp);
  });

  it('selectObjectで前の値が上書きされる', () => {
    service.selectObject('first-id', 'ClassA');
    service.selectObject('second-id', 'ClassB');

    const result = service.selectedObject();
    expect(result).toEqual({ identifier: 'second-id', className: 'ClassB' });
  });

  it('cancelTableGestureでcancelTableGestureVersionが増加する', () => {
    const initial = service.cancelTableGestureVersion();
    service.cancelTableGesture();
    expect(service.cancelTableGestureVersion()).toBe(initial + 1);
  });

  it('cancelTableGestureを連続呼出しでカウントが正しく増加する', () => {
    const initial = service.cancelTableGestureVersion();
    service.cancelTableGesture();
    service.cancelTableGesture();
    service.cancelTableGesture();
    expect(service.cancelTableGestureVersion()).toBe(initial + 3);
  });

  describe('複数選択 API', () => {
    it('初期状態では selectedObjects は空の Set', () => {
      expect(service.selectedObjects()).toBeInstanceOf(Set);
      expect(service.selectedObjects().size).toBe(0);
      expect(service.selectionSize()).toBe(0);
    });

    it('addSelection で identifier が追加される', () => {
      service.addSelection('id-1', 'GameCharacter');
      expect(service.isSelected('id-1')).toBe(true);
      expect(service.selectionSize()).toBe(1);
      expect(service.selectedObject()).toEqual({ identifier: 'id-1', className: 'GameCharacter' });
    });

    it('addSelection は同じ id を二重登録しない', () => {
      service.addSelection('id-1');
      service.addSelection('id-1');
      expect(service.selectionSize()).toBe(1);
    });

    it('removeSelection で identifier が削除される', () => {
      service.addSelection('id-1');
      service.addSelection('id-2');
      service.removeSelection('id-1');
      expect(service.isSelected('id-1')).toBe(false);
      expect(service.isSelected('id-2')).toBe(true);
    });

    it('toggleSelection は未選択なら追加・選択中なら削除', () => {
      service.toggleSelection('id-1', 'GameCharacter');
      expect(service.isSelected('id-1')).toBe(true);
      service.toggleSelection('id-1');
      expect(service.isSelected('id-1')).toBe(false);
    });

    it('replaceSelection は集合を置換する', () => {
      service.addSelection('id-1');
      service.addSelection('id-2');
      service.replaceSelection(['id-3', 'id-4'], { identifier: 'id-3', className: 'DiceSymbol' });
      expect(service.isSelected('id-1')).toBe(false);
      expect(service.isSelected('id-3')).toBe(true);
      expect(service.isSelected('id-4')).toBe(true);
      expect(service.selectedObject()?.identifier).toBe('id-3');
    });

    it('clearSelection で集合が空になる', () => {
      service.addSelection('id-1');
      service.addSelection('id-2');
      service.clearSelection();
      expect(service.selectionSize()).toBe(0);
    });

    it('集合更新時に新しい Set 参照を返す（イミュータブル）', () => {
      const before = service.selectedObjects();
      service.addSelection('id-1');
      const after = service.selectedObjects();
      expect(after).not.toBe(before);
    });
  });

  describe('marqueeState', () => {
    it('初期状態は null', () => {
      expect(service.marqueeState()).toBeNull();
    });

    it('signal として更新できる', () => {
      service.marqueeState.set({ x1: 0, y1: 0, x2: 100, y2: 100 });
      expect(service.marqueeState()).toEqual({ x1: 0, y1: 0, x2: 100, y2: 100 });
    });
  });
});
