import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ControllerInputComponent } from './controller-input.component';

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
});
