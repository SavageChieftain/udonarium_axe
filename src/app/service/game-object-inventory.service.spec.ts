import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameObjectInventoryService } from './game-object-inventory.service';

describe('GameObjectInventoryService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] }));

  it('should be created', () => {
    const service: GameObjectInventoryService = TestBed.inject(GameObjectInventoryService);
    expect(service).toBeTruthy();
  });
});
