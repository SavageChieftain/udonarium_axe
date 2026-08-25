import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag, SYSTEM_RESERVED_TAG } from '@axe/domain/media/image-tag';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';

describe('FileSelecterComponent', () => {
  let component: FileSelecterComponent;
  let fixture: ComponentFixture<FileSelecterComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FileSelecterComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileSelecterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the pictures it offers', () => {
    function put(identifier: string, tag: string): void {
      const file = TestBed.inject(ImageStorage).add(identifier);
      ImageTag.create(file.identifier).tag = tag;
    }

    it('offers what a person put there', () => {
      put('a-drawing', 'コマ');

      expect(component.getAllImage().map((image) => image.identifier)).toContain('a-drawing');
    });

    it('keeps back what the tool brought with it, whatever language the screen is in', () => {
      // The tag is a stored word shared round the room, not the word for it on this screen,
      // so matching it against a translation used to leave these on show for half the world.
      put('a-die-face', SYSTEM_RESERVED_TAG);

      expect(component.getAllImage().map((image) => image.identifier)).not.toContain('a-die-face');
      expect(component.tagList).not.toContain(SYSTEM_RESERVED_TAG);
    });
  });
});
