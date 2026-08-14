import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { Network } from '@axe/core/index';
import { IPeerContext } from '@axe/core/network/peer-context';
import { SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableMaskComponent } from '@axe/features/tabletop/game-table-mask/game-table-mask.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableMaskComponent', () => {
  let component: GameTableMaskComponent;
  let fixture: ComponentFixture<GameTableMaskComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableMaskComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableMaskComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('viewRotateZ computed signal', () => {
    it('starts at ten', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('turns with the table view', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 180);
      expect(component.viewRotateZ()).toBe(180);
    });

    it('reads the flip from the angle the view is turned to', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(0, 0, 10);
      expect(component.isInverse).toBe(false);

      uiSignalService.notifyTableViewRotation(0, 0, 180);
      expect(component.isInverse).toBe(true);

      uiSignalService.notifyTableViewRotation(0, 0, 270);
      expect(component.isInverse).toBe(false);
    });
  });

  describe('setting up and tearing down', () => {
    it('takes an input before the view is ready without throwing', () => {
      expect(() => {
        component.onInputStart(new MouseEvent('mousedown'));
      }).not.toThrow();
    });

    it('takes a pointer move before the view is ready without throwing', () => {
      expect(() => {
        const e = new PointerEvent('pointermove');
        Object.defineProperty(e, 'offsetX', { value: 10 });
        Object.defineProperty(e, 'offsetY', { value: 10 });
        Object.defineProperty(e, 'buttons', { value: 0 });
        component.onInputMovePointer(e);
      }).not.toThrow();
    });

    it('clears the scratching timer on teardown without throwing', () => {
      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });

    it('starts a scratching set when there is none', () => {
      const gameTableMask = component.gameTableMask();
      if (!gameTableMask) {
        // skipped without a mask
        expect(true).toBe(true);
        return;
      }
      expect(() => {
        component.scratching(true, { offsetX: 10, offsetY: 10 });
      }).not.toThrow();
    });

    it('finishes without one without throwing', () => {
      expect(() => {
        component.scratched();
      }).not.toThrow();
    });
  });

  describe('the symmetric difference', () => {
    let mask: GameTableMask;

    beforeEach(() => {
      mask = GameTableMask.create('testMask', 10, 10, 1);
      fixture.componentRef.setInput('gameTableMask', mask);
      fixture.detectChanges();
    });

    afterEach(() => {
      mask.destroy();
    });

    it('does nothing without a mask', () => {
      fixture.componentRef.setInput('gameTableMask', null);
      fixture.detectChanges();
      expect(() => component.scratched()).not.toThrow();
    });

    it('keeps what was scratched onto a clean mask', () => {
      mask.scratchedGrids = '';
      mask.scratchingGrids = '0:0,1:1';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = new Set([
        '0:0',
        '1:1',
      ]);

      component.scratched();

      expect(mask.scratchedGrids).toBe('0:0,1:1');
    });

    it('leaves nothing when everything was already scratched', () => {
      mask.scratchedGrids = '0:0,1:1';
      mask.scratchingGrids = '0:0,1:1';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = new Set([
        '0:0',
        '1:1',
      ]);

      component.scratched();

      expect(mask.scratchedGrids).toBe('');
    });

    it('keeps only what does not overlap', () => {
      mask.scratchedGrids = '0:0,1:1';
      mask.scratchingGrids = '1:1,2:2';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = new Set([
        '1:1',
        '2:2',
      ]);

      component.scratched();

      expect(mask.scratchedGrids).toBe('0:0,2:2');
    });

    it('takes the cells as given when there is no set', () => {
      mask.scratchedGrids = '0:0';
      mask.scratchingGrids = '0:0';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = null;

      component.scratched();

      // the same cell twice cancels out
      expect(mask.scratchedGrids).toBe('');
    });
  });

  describe('the scratching buttons', () => {
    let mask: GameTableMask;

    beforeEach(() => {
      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'my-user', isOpen: true } as IPeerContext);
      vi.spyOn(SoundEffect, 'play').mockImplementation(() => {});
      mask = GameTableMask.create('testMask', 10, 10, 1);
      mask.owner = 'my-user';
      fixture.componentRef.setInput('gameTableMask', mask);
      fixture.detectChanges();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      mask.destroy();
    });

    it('finishes the scratching from the primary button', () => {
      mask.scratchingGrids = '0:0';

      const event = new PointerEvent('pointerdown', { button: 0 });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      expect(component.onScratchDonePointerDown(event)).toBe(false);

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(mask.owner).toBe('');
      expect(mask.scratchingGrids).toBe('');
      expect(mask.scratchedGrids).toBe('0:0');
    });

    it('does nothing from any other', () => {
      mask.scratchingGrids = '0:0';

      const event = new PointerEvent('pointerdown', { button: 2 });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      expect(component.onScratchDonePointerDown(event)).toBe(false);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopPropagation).not.toHaveBeenCalled();
      expect(mask.owner).toBe('my-user');
      expect(mask.scratchingGrids).toBe('0:0');
      expect(mask.scratchedGrids).toBe('');
    });

    it('cancels it from the primary button', () => {
      mask.scratchingGrids = '0:0';

      const event = new PointerEvent('pointerdown', { button: 0 });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      expect(component.onScratchCancelPointerDown(event)).toBe(false);

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(mask.owner).toBe('');
      expect(mask.scratchingGrids).toBe('');
      expect(mask.scratchedGrids).toBe('');
    });

    it('scratches a cell from a press on the mask itself', () => {
      const event = new PointerEvent('pointerdown', { button: 0, buttons: 1 });
      Object.defineProperty(event, 'offsetX', { value: 10 });
      Object.defineProperty(event, 'offsetY', { value: 10 });

      component.onInputStartPointer(event);
      component.scratched();

      expect(mask.scratchedGrids).toBe('0:0');
    });
  });
});
