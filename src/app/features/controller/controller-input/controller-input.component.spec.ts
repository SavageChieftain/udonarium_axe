import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControllerInputComponent } from '@axe/features/controller/controller-input/controller-input.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ControllerInputComponent', () => {
  let component: ControllerInputComponent;
  let fixture: ComponentFixture<ControllerInputComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ControllerInputComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ControllerInputComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signal-driven CD', () => {
    it('holds the sender in a model signal', () => {
      expect(typeof component.sendFrom).toBe('function');
    });

    it('holds the portrait index in a linked one', () => {
      expect(typeof component.portraitIndex).toBe('function');
    });

    it('computes the image', () => {
      expect(typeof component.imageFile).toBe('function');
    });

    it('computes the characters', () => {
      expect(typeof component.gameCharacters).toBe('function');
      expect(Array.isArray(component.gameCharacters())).toBe(true);
    });
  });
});
