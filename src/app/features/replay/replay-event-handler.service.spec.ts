import { TestBed } from '@angular/core/testing';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayPreferenceService, ReplayStartMode } from '@axe/application/replay/replay-preference.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { Network } from '@axe/core/network/network';
import { localDispatch } from '@axe/core/network/network-messaging';
import {
  REPLAY_AUTO_START_SETTLE_MS,
  ReplayEventHandlerService,
} from '@axe/features/replay/replay-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ReplayEventHandlerService', () => {
  let recorder: {
    isSupported: boolean;
    isRecording: () => boolean;
    start: () => Promise<boolean>;
    stop: () => Promise<void>;
  };
  let recording = false;
  let canEdit = true;
  let roomName = '第一夜';

  beforeEach(() => {
    localStorage.removeItem('axe-replay-preference');
    vi.useFakeTimers();
    recording = false;
    canEdit = true;
    roomName = '第一夜';

    recorder = {
      isSupported: true,
      isRecording: () => recording,
      start: vi.fn(async () => {
        recording = true;
        return true;
      }),
      stop: vi.fn(async () => {
        recording = false;
      }),
    };

    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName } as never);

    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: ReplayRecorderService, useValue: recorder },
        {
          provide: RolePermissionService,
          useValue: {
            get canEditTabletop() {
              return canEdit;
            },
          },
        },
      ],
    });
    TestBed.inject(ReplayEventHandlerService);
  });

  afterEach(() => {
    localStorage.removeItem('axe-replay-preference');
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('部屋に入って落ち着いたら録画を始めること', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    expect(recorder.start).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it('落ち着くまでに何度知らされても一度しか始めないこと', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it('部屋の外では録画を始めないこと', () => {
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).not.toHaveBeenCalled();
  });

  it('見学者は録画しないこと', () => {
    canEdit = false;
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).not.toHaveBeenCalled();
  });

  it('部屋を出たら録画を止めること', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recording).toBe(true);

    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    expect(recorder.stop).toHaveBeenCalledTimes(1);
  });

  it('自分で始める設定なら勝手に始めないこと', () => {
    TestBed.inject(ReplayPreferenceService).setStartMode(ReplayStartMode.Manual);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).not.toHaveBeenCalled();
  });

  it('自分で始める設定でも、部屋を出れば止めること', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recording).toBe(true);

    TestBed.inject(ReplayPreferenceService).setStartMode(ReplayStartMode.Manual);
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    expect(recorder.stop).toHaveBeenCalledTimes(1);
  });

  it('自分で始めたものを勝手に止めないこと', () => {
    TestBed.inject(ReplayPreferenceService).setStartMode(ReplayStartMode.Manual);
    recording = true;
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.stop).not.toHaveBeenCalled();
  });

  it('保存できない環境では何もしないこと', () => {
    recorder.isSupported = false;
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).not.toHaveBeenCalled();
  });
});
