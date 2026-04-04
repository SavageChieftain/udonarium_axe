import { inject, TestBed } from '@angular/core/testing';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TabletopService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, TabletopService],
    });
  });

  it('should be created', inject([TabletopService], (service: TabletopService) => {
    expect(service).toBeTruthy();
  }));
});
