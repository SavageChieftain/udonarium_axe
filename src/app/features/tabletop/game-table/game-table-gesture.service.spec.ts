import { TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { GameTableGestureService } from '@axe/features/tabletop/game-table/game-table-gesture.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableGestureService', () => {
  let service: GameTableGestureService;
  let gameTableEl: HTMLElement;

  const callSetTransform = (rX: number, rY: number, rZ: number): void => {
    service.setTransform(0, 0, 0, rX, rY, rZ);
  };

  /** The view is written out on the next frame, so a test that reads it waits for one. */
  const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, GameTableGestureService],
    });
    service = TestBed.inject(GameTableGestureService);
    gameTableEl = document.createElement('div');
    (service as unknown as { gameTableEl: HTMLElement }).gameTableEl = gameTableEl;
  });

  describe('tiltLocked', () => {
    it('adds the tilt while it is unlocked', () => {
      service.viewRotateX = 50;
      service.tiltLocked = false;
      callSetTransform(10, 0, 0);
      expect(service.viewRotateX).toBe(60);
    });

    it('ignores the tilt and holds the view flat while it is locked', () => {
      service.viewRotateX = 50;
      service.tiltLocked = true;
      callSetTransform(10, 0, 0);
      expect(service.viewRotateX).toBe(0);
    });

    it('snaps the tilt back to nothing when the view is reset while locked', () => {
      service.viewRotateX = 35;
      service.viewRotateY = 12;
      service.tiltLocked = true;
      callSetTransform(0, 0, 0);
      expect(service.viewRotateX).toBe(0);
      expect(service.viewRotateY).toBe(0);
    });

    it('still turns about the vertical while locked', () => {
      service.viewRotateZ = 10;
      service.tiltLocked = true;
      callSetTransform(0, 0, 30);
      expect(service.viewRotateZ).toBe(40);
    });
  });

  describe('showing the view', () => {
    it('writes it out once for a run of moves, on the frame after them', async () => {
      callSetTransform(0, 0, 10);
      callSetTransform(0, 0, 10);
      callSetTransform(0, 0, 10);
      expect(gameTableEl.style.transform).toBe('');

      await nextFrame();

      expect(service.viewRotateZ).toBe(40);
      expect(gameTableEl.style.transform).toContain('rotateZ(40.0000deg)');
    });

    it('tells the table which way it faces once for that run', async () => {
      const rotation = TestBed.inject(UiSignalService).tableViewRotation;
      callSetTransform(0, 0, 10);
      callSetTransform(0, 0, 10);
      await nextFrame();

      expect(rotation()).toEqual({ x: 50, y: 0, z: 30 });
    });

    it('says nothing about the way it faces when the view was only slid', async () => {
      const rotation = TestBed.inject(UiSignalService).tableViewRotation;
      service.setTransform(40, 0, 0, 0, 0, 0);
      await nextFrame();

      expect(gameTableEl.style.transform).toContain('translateX(140.0000px)');
      expect(rotation()).toBeNull();
    });

    it('drops a frame it was still waiting for when the table goes', async () => {
      callSetTransform(0, 0, 10);
      service.destroy();
      await nextFrame();

      expect(gameTableEl.style.transform).toBe('');
    });
  });
});
