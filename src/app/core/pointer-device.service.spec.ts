import { inject, TestBed } from '@angular/core/testing';

import { PointerDeviceService } from './pointer-device.service';

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
});
