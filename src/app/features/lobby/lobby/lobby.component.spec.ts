import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { LobbyComponent } from '@axe/features/lobby/lobby/lobby.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('LobbyComponent', () => {
  let component: LobbyComponent;
  let fixture: ComponentFixture<LobbyComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LobbyComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LobbyComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('asks for no change detector', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).cdr).toBeUndefined();
  });

  describe('connect()', () => {
    let openSpy: ReturnType<typeof vi.spyOn>;
    let originalMyCursor: PeerCursor;

    beforeEach(() => {
      originalMyCursor = PeerCursor.myCursor;
      PeerCursor.myCursor = { peerId: '', reConnectPass: '' } as unknown as PeerCursor;
      openSpy = vi.spyOn(Network, 'open').mockImplementation(() => {});
      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'test-user' } as PeerContext);
    });

    afterEach(() => {
      PeerCursor.myCursor = originalMyCursor;
      vi.restoreAllMocks();
    });

    it('does not open the connection on a wrong password', async () => {
      const ctx = PeerContext.parse('test-peer');
      vi.spyOn(ctx, 'verifyPassword').mockResolvedValue(false);

      await component.connect([ctx]);

      expect(openSpy).not.toHaveBeenCalled();
    });

    it('opens it on the right one', async () => {
      const ctx = PeerContext.parse('test-peer');
      vi.spyOn(ctx, 'verifyPassword').mockResolvedValue(true);

      await component.connect([ctx]);

      expect(openSpy).toHaveBeenCalledOnce();
    });

    it('does not open it when the password dialogue is dismissed', async () => {
      const ctx = PeerContext.parse('test-peer');
      Object.defineProperty(ctx, 'hasPassword', { get: () => true });
      vi.spyOn(ctx, 'verifyPassword').mockResolvedValue(false);
      vi.spyOn(TestBed.inject(ModalService), 'open').mockResolvedValue(null as unknown as string);

      await component.connect([ctx]);

      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('signal-driven CD', () => {
    it('holds the rooms in a signal', () => {
      expect(typeof component.rooms).toBe('function');
    });

    it('holds the reloading flag in one', () => {
      expect(typeof component.isReloading).toBe('function');
    });

    it('holds the help text in one', () => {
      expect(typeof component.help).toBe('function');
    });

    it('reads the connection through the network version', () => {
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'networkVersion');
      void component.isConnected();
      expect(spy).toHaveBeenCalled();
    });
  });
});
