import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RangeShapeEditorComponent } from '@axe/features/tabletop/range-shape-editor/range-shape-editor.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('RangeShapeEditorComponent', () => {
  let fixture: ComponentFixture<RangeShapeEditorComponent>;
  let component: RangeShapeEditorComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RangeShapeEditorComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(RangeShapeEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initialize で cellSet が復元される', () => {
    component.initialize({
      name: 'test',
      gridType: 'square',
      cellPattern: '0,0;1,0;0,1',
      gridColor: '#FF0000',
      rangeColor: '#00FF00',
      isRotatable: true,
    });
    expect(component.cellSet().size).toBe(3);
    expect(component.cellSet().has('0,0')).toBe(true);
    expect(component.cellSet().has('1,0')).toBe(true);
    expect(component.cellSet().has('0,1')).toBe(true);
    expect(component.name()).toBe('test');
    expect(component.gridColor()).toBe('#FF0000');
    expect(component.rangeColor()).toBe('#00FF00');
    expect(component.isRotatable()).toBe(true);
  });

  it('clear() で全マスが消える', () => {
    component.initialize({ cellPattern: '0,0;1,1' });
    expect(component.cellSet().size).toBe(2);
    (component as unknown as { clear: () => void }).clear();
    expect(component.cellSet().size).toBe(0);
  });

  it('save() で正規化されたパターンが emit される', () => {
    component.initialize({
      name: '  L字  ',
      cellPattern: '1,0;0,1;0,0',
      gridType: 'square',
      gridColor: '#AAA',
      rangeColor: '#BBB',
    });
    let result: ReturnType<typeof component.saved.emit> | null = null;
    component.saved.subscribe((r) => {
      result = r as unknown as typeof result;
    });
    (component as unknown as { save: () => void }).save();

    expect(result).not.toBeNull();
    const r = result! as unknown as { name: string; cellPattern: string; gridType: string; isRotatable: boolean };
    expect(r.name).toBe('L字');
    expect(r.cellPattern).toBe('0,0;1,0;0,1');
    expect(r.gridType).toBe('square');
    expect(r.isRotatable).toBe(false);
  });

  it('cancel() で cancelled が emit される', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => {
      cancelled = true;
    });
    (component as unknown as { cancel: () => void }).cancel();
    expect(cancelled).toBe(true);
  });

  it('setGridType で不正値は無視される', () => {
    component.initialize({ gridType: 'square' });
    (component as unknown as { setGridType: (v: string) => void }).setGridType('invalid');
    expect(component.gridType()).toBe('square');
    (component as unknown as { setGridType: (v: string) => void }).setGridType('hex-vertical');
    expect(component.gridType()).toBe('hex-vertical');
  });
});
