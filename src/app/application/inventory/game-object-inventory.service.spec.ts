import { TestBed } from '@angular/core/testing';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameObjectInventoryService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] }));

  it('should be created', () => {
    const service: GameObjectInventoryService = TestBed.inject(GameObjectInventoryService);
    expect(service).toBeTruthy();
  });
});
