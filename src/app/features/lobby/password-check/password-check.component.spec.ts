import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { PasswordCheckComponent } from '@axe/features/lobby/password-check/password-check.component';

describe('PasswordCheckComponent', () => {
  let component: PasswordCheckComponent;
  let fixture: ComponentFixture<PasswordCheckComponent>;
  let modalService: ModalService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PasswordCheckComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    // Provide ModalService.option for constructor
    modalService = TestBed.inject(ModalService);
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

  describe('submit()', () => {
    let resolveSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      resolveSpy = vi.spyOn(modalService, 'resolve').mockImplementation(() => {});
    });

    it('正しいパスワードでmodalService.resolve(password)が呼ばれること', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((component as any).targetPeerContext, 'verifyPassword').mockResolvedValue(true);
      component.password.set('correct');

      await component.submit();

      expect(resolveSpy).toHaveBeenCalledWith('correct');
    });

    it('正しいパスワードでhelpが「パスワードが違います」にならないこと', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((component as any).targetPeerContext, 'verifyPassword').mockResolvedValue(true);
      component.password.set('correct');

      await component.submit();

      expect(component.help()).toBe('');
    });

    it('間違ったパスワードでmodalService.resolveが呼ばれないこと', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((component as any).targetPeerContext, 'verifyPassword').mockResolvedValue(false);
      component.password.set('wrong');

      await component.submit();

      expect(resolveSpy).not.toHaveBeenCalled();
    });

    it('間違ったパスワードでhelpが「パスワードが違います」になること', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((component as any).targetPeerContext, 'verifyPassword').mockResolvedValue(false);
      component.password.set('wrong');

      await component.submit();

      expect(component.help()).toBe('パスワードが違います');
    });
  });
});
