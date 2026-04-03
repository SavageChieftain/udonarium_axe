import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LobbyComponent } from '@axe/features/lobby/lobby/lobby.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
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

  it('ChangeDetectorRefを使用していないこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).cdr).toBeUndefined();
  });

  describe('signal-driven CD', () => {
    it('roomsがsignalであること', () => {
      expect(typeof component.rooms).toBe('function');
    });

    it('isReloadingがsignalであること', () => {
      expect(typeof component.isReloading).toBe('function');
    });

    it('helpがsignalであること', () => {
      expect(typeof component.help).toBe('function');
    });

    it('isConnectedシグナルがnetworkVersionシグナルを使用すること', () => {
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChangeService, 'networkVersion');
      void component.isConnected();
      expect(spy).toHaveBeenCalled();
    });
  });
});
