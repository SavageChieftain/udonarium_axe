import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from 'service/modal.service';

import { PasswordCheckComponent } from './password-check.component';

describe('PasswordCheckComponent', () => {
  let component: PasswordCheckComponent;
  let fixture: ComponentFixture<PasswordCheckComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PasswordCheckComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    // Provide ModalService.option for constructor
    const modalService = TestBed.inject(ModalService);
    // Use reflection to set private modalContext
    (modalService as unknown as Record<string, unknown>).modalContext = {
      option: { peerId: 'test-peer-id', title: 'Test Title' },
    };

    fixture = TestBed.createComponent(PasswordCheckComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
