import { TestBed } from '@angular/core/testing';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayPreferenceService, ReplayStartMode } from '@axe/application/replay/replay-preference.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { Network } from '@axe/core/network/network';
import { setNetworkIsolated } from '@axe/core/network/network-isolation';
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
    roomName: () => string;
    start: () => Promise<boolean>;
    stop: () => Promise<void>;
  };
  let recording = false;
  let startedIn = '';
  let canEdit = true;
  let roomName = '第一夜';

  beforeEach(() => {
    localStorage.removeItem('axe-replay-preference');
    vi.useFakeTimers();
    recording = false;
    startedIn = '';
    canEdit = true;
    roomName = '第一夜';

    recorder = {
      isSupported: true,
      isRecording: () => recording,
      roomName: () => startedIn,
      start: vi.fn(async () => {
        recording = true;
        startedIn = Network.peerContext?.roomName ?? '';
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
    setNetworkIsolated(false);
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

  it('部屋がなくてもひとりの卓を録画すること', () => {
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it('ひとりの卓から部屋へ移ったら録画を締めること', () => {
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recording).toBe(true);

    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '第一夜' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    expect(recorder.stop).toHaveBeenCalledTimes(1);
  });

  it('締めたあとは移った先の卓を録り直すこと', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);

    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '第二夜' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).toHaveBeenCalledTimes(2);
    expect(startedIn).toBe('第二夜');
  });

  it('再生で卓を預かっているあいだは始めないこと', () => {
    setNetworkIsolated(true);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).not.toHaveBeenCalled();
  });

  it('待っている間に再生へ入ったら始めないこと', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    setNetworkIsolated(true);

    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).not.toHaveBeenCalled();

    setNetworkIsolated(false);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    vi.advanceTimersByTime(REPLAY_AUTO_START_SETTLE_MS);
    expect(recorder.start).toHaveBeenCalledTimes(1);
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
    startedIn = '第一夜';
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
