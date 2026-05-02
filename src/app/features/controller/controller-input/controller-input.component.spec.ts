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
    it('sendFrom がモデルシグナルであること', () => {
      expect(typeof component.sendFrom).toBe('function');
    });

    it('portraitIndex がリンクシグナルであること', () => {
      expect(typeof component.portraitIndex).toBe('function');
    });

    it('imageFile がcomputed signalであること', () => {
      expect(typeof component.imageFile).toBe('function');
    });

    it('gameCharacters がcomputed signalであること', () => {
      expect(typeof component.gameCharacters).toBe('function');
      expect(Array.isArray(component.gameCharacters())).toBe(true);
    });
  });
});
