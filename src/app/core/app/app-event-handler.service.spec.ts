import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { AppEventHandlerService } from './app-event-handler.service';

describe('AppEventHandlerService', () => {
  let service: AppEventHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS],
    });
    service = TestBed.inject(AppEventHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('renderVersion の初期値が 0 であること', () => {
    expect(service.renderVersion()).toBe(0);
  });

  it('initialize() がエラーなく実行されること', () => {
    expect(() => service.initialize()).not.toThrow();
  });
});
