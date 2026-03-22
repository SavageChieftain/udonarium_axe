import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from 'testing/test-providers';

import { TabletopActionService } from './tabletop-action.service';

describe('TabletopActionService', () => {
  let service: TabletopActionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(TabletopActionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
