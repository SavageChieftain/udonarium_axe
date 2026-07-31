import { ApplicationRef, effect, Injector, signal } from '@angular/core';
import { inject, TestBed } from '@angular/core/testing';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';

describe('PointerDeviceService', () => {
  let service: PointerDeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PointerDeviceService],
    });

    service = TestBed.inject(PointerDeviceService);
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
  });

  it('should ...', inject([PointerDeviceService], (service: PointerDeviceService) => {
    expect(service).toBeTruthy();
  }));

  it('mouseup で dragging 状態を解除すること', () => {
    service.isDragging = true;

    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(service.isDragging).toBe(false);
  });

  it('buttons=0 の mousemove で dragging 状態を解除すること', () => {
    service.isDragging = true;

    document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 0 }));

    expect(service.isDragging).toBe(false);
  });

  it('visibilitychange で hidden になったとき dragging 状態を解除すること', () => {
    service.isDragging = true;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(service.isDragging).toBe(false);
  });

  it('effect 内 setter 実行で isDragging 依存を追加しないこと', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const injector = TestBed.inject(Injector);
    const trigger = signal(0);
    let runCount = 0;

    const effectRef = effect(
      () => {
        trigger();
        service.isDragging = false;
        runCount++;
      },
      { injector }
    );

    appRef.tick();
    expect(runCount).toBe(1);

    service.isDragging = true;
    appRef.tick();
    expect(runCount).toBe(1);

    trigger.set(1);
    appRef.tick();
    expect(runCount).toBe(2);

    effectRef.destroy();
  });

  describe('タッチの長押し', () => {
    interface FakeTouchEvent {
      touches: Touch[];
      targetTouches: Touch[];
      changedTouches: Touch[];
    }

    function touchEvent(type: string, x: number, y: number, target: EventTarget): Event {
      const touch = { identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y } as unknown as Touch;
      const event = new Event(type, { bubbles: true, cancelable: true });
      const fake = event as unknown as FakeTouchEvent;
      fake.touches = type === 'touchend' ? [] : [touch];
      fake.targetTouches = fake.touches;
      fake.changedTouches = [touch];
      return event;
    }

    let target: HTMLElement;
    let opened: MouseEvent[];

    beforeEach(() => {
      vi.useFakeTimers();
      target = document.createElement('div');
      document.body.appendChild(target);
      opened = [];
      target.addEventListener('contextmenu', (e) => opened.push(e as MouseEvent));
    });

    afterEach(() => {
      vi.useRealTimers();
      target.remove();
    });

    it('押したままにするとコンテキストメニューを開く', () => {
      target.dispatchEvent(touchEvent('touchstart', 50, 60, target));

      expect(opened).toHaveLength(0);
      vi.advanceTimersByTime(500);

      expect(opened).toHaveLength(1);
      expect(opened[0].clientX).toBe(50);
      expect(opened[0].clientY).toBe(60);
    });

    it('指を動かしたら開かない', () => {
      target.dispatchEvent(touchEvent('touchstart', 50, 60, target));
      document.body.dispatchEvent(touchEvent('touchmove', 90, 120, target));

      vi.advanceTimersByTime(500);

      expect(opened).toHaveLength(0);
    });

    it('すぐ離したら開かない', () => {
      target.dispatchEvent(touchEvent('touchstart', 50, 60, target));
      document.body.dispatchEvent(touchEvent('touchend', 50, 60, target));

      vi.advanceTimersByTime(500);

      expect(opened).toHaveLength(0);
    });

    it('2 本指では開かない', () => {
      const two = touchEvent('touchstart', 50, 60, target);
      const fake = two as unknown as FakeTouchEvent;
      fake.touches = [fake.touches[0], fake.touches[0]];
      target.dispatchEvent(two);

      vi.advanceTimersByTime(500);

      expect(opened).toHaveLength(0);
    });
  });
});
