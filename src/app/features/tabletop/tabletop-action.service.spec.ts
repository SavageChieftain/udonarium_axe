import { TestBed } from '@angular/core/testing';
import { TabletopActionService } from '@axe/features/tabletop/tabletop-action.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

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
