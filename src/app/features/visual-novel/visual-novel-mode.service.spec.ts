import { TestBed } from '@angular/core/testing';
import { localDispatch, networkMessage$ } from '@axe/core/network/network-messaging';
import { VisualNovelModeService, VN_MODE_EVENT } from '@axe/features/visual-novel/visual-novel-mode.service';

describe('VisualNovelModeService', () => {
  let service: VisualNovelModeService;
  let announced: boolean[];
  let off: () => void;

  beforeEach(() => {
    announced = [];
    off = networkMessage$.subscribe((message) => {
      if (message.eventName === VN_MODE_EVENT) announced.push(Boolean((message.data as { active: boolean }).active));
    });
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisualNovelModeService);
  });

  afterEach(() => {
    off();
  });

  it('初期状態では非アクティブであること', () => {
    expect(service.active()).toBe(false);
  });

  it('activate() / deactivate() でアクティブ状態が切り替わること', () => {
    service.activate();
    expect(service.active()).toBe(true);
    service.deactivate();
    expect(service.active()).toBe(false);
  });

  it('toggle() でアクティブ状態が反転すること', () => {
    service.toggle();
    expect(service.active()).toBe(true);
    service.toggle();
    expect(service.active()).toBe(false);
  });

  it('切り替えを記録できるよう手元に知らせること', () => {
    service.activate();
    service.deactivate();
    expect(announced).toEqual([true, false]);
  });

  it('変わらないときは知らせないこと', () => {
    service.deactivate();
    service.activate();
    service.activate();
    expect(announced).toEqual([true]);
  });

  it('知らせを受けて表示を合わせること', () => {
    localDispatch(VN_MODE_EVENT, { active: true });
    expect(service.active()).toBe(true);

    localDispatch(VN_MODE_EVENT, { active: false });
    expect(service.active()).toBe(false);
  });

  it('知らせを受けても知らせを重ねないこと', () => {
    localDispatch(VN_MODE_EVENT, { active: true });
    expect(announced).toEqual([true]);
    expect(service.active()).toBe(true);
  });
});
