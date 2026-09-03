import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PointerDeviceService } from '@axe/application/input/pointer-device.service';
import { RangeShapeInvokeService } from '@axe/application/tabletop/range-shape-invoke.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { encodeRangeShapeField } from '@axe/domain/data/range-shape-field';
import { GameDataElementRangeShapeComponent } from '@axe/features/data-element/game-data-element-range-shape/game-data-element-range-shape.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

interface Internals {
  spawnRangeShape(): void;
}

describe('GameDataElementRangeShapeComponent', () => {
  let fixture: ComponentFixture<GameDataElementRangeShapeComponent>;
  let component: GameDataElementRangeShapeComponent;
  let invoke: { spawnForCharacter: ReturnType<typeof vi.fn>; spawnAt: ReturnType<typeof vi.fn> };

  const shape = {
    name: '扇',
    cellPattern: '0,0;1,0;0,1',
    gridType: 'square' as const,
    gridColor: '#123456',
    rangeColor: '#654321',
    isRotatable: true,
  };

  function element(value: string): DataElement {
    const el = DataElement.create('射程', 0, { type: 'rangeShape', currentValue: value });
    el.initialize();
    return el;
  }

  function mount(el: DataElement): void {
    fixture = TestBed.createComponent(GameDataElementRangeShapeComponent);
    fixture.componentRef.setInput('element', el);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    invoke = { spawnForCharacter: vi.fn(), spawnAt: vi.fn() };
    TestBed.configureTestingModule({
      imports: [GameDataElementRangeShapeComponent],
      providers: [...TEST_PROVIDERS],
    });
    TestBed.overrideProvider(RangeShapeInvokeService, { useValue: invoke });
    TestBed.overrideProvider(PanelService, { useValue: { open: vi.fn() } });
    TestBed.overrideProvider(PointerDeviceService, { useValue: { pointers: [{ x: 120, y: 240 }] } });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('reads the shape off the element, and falls back to an empty one', () => {
    mount(element(encodeRangeShapeField(shape)));
    expect(component.rangeShapeValue()).toEqual(expect.objectContaining({ cellPattern: '0,0;1,0;0,1' }));
    expect(component.rangeShapeSummary()).toContain('3');
    expect(component.rangeShapeThumbnail().hasCells).toBe(true);

    mount(element('nonsense'));
    expect(component.rangeShapeValue().cellPattern).toBe('');
    expect(component.rangeShapeThumbnail().hasCells).toBe(false);
  });

  it('throws the shape from the character it belongs to', () => {
    const character = GameCharacter.create('斥候', 1, '');
    const el = element(encodeRangeShapeField(shape));
    character.appendChild(el);
    mount(el);

    (component as unknown as Internals).spawnRangeShape();

    expect(invoke.spawnForCharacter).toHaveBeenCalledWith(character, component.rangeShapeValue());
    expect(invoke.spawnAt).not.toHaveBeenCalled();
  });

  it('throws it at the pointer when it belongs to nobody', () => {
    mount(element(encodeRangeShapeField(shape)));

    (component as unknown as Internals).spawnRangeShape();

    expect(invoke.spawnAt).toHaveBeenCalledWith({ x: 120, y: 240, z: 0 }, component.rangeShapeValue());
  });
});
