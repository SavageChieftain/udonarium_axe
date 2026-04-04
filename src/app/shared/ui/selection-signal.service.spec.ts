import { TestBed } from '@angular/core/testing';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';

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
});
