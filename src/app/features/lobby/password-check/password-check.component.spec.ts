import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { PeerContext } from '@axe/core/network/peer-context';
import {
  PasswordCheckComponent,
  type PasswordCheckOptions,
} from '@axe/features/lobby/password-check/password-check.component';

function setModalOption(modalService: ModalService, option: PasswordCheckOptions): void {
  (modalService as unknown as Record<string, unknown>).modalContext = { option };
}

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
    modalService = TestBed.inject(ModalService);
    setModalOption(modalService, {
      peerContext: PeerContext.parse('test-peer-id'),
      title: 'Test Title',
    });
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

  describe('受け取った PeerContext での verifyPassword', () => {
    it('createRoom で組み立てた完全な PeerContext を渡せば正しいパスワードが通り、誤りは弾かれる', async () => {
      // 呼び出し側 (lobby) は roomName 入りの完全な PeerContext を渡してくる前提。
      // 修正前は peerId 文字列だけを渡しており、parse 結果は roomName が空で digest がずれて
      // 常に false になる回帰を起こしていた。
      const room = await PeerContext.createRoom('user', 'a1', 'マイルーム', 'secret');
      setModalOption(modalService, {
        peerContext: room,
        title: 'マイルーム/a1',
      });
      const probe = TestBed.createComponent(PasswordCheckComponent);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const target = (probe.componentInstance as any).targetPeerContext as PeerContext;

      expect(target.roomName).toBe('マイルーム');
      expect(await target.verifyPassword('secret')).toBe(true);
      expect(await target.verifyPassword('wrong')).toBe(false);
    });
  });
});
