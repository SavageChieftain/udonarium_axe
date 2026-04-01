import { TestBed } from '@angular/core/testing';
import { ImageService } from '@axe/core/storage/image.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(ImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
