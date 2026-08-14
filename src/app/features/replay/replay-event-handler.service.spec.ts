import { TestBed } from '@angular/core/testing';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { Network } from '@axe/core/network/network';
import { localDispatch } from '@axe/core/network/network-messaging';
import { ReplayEventHandlerService } from '@axe/features/replay/replay-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ReplayEventHandlerService', () => {
  let recorder: { isRecording: () => boolean; roomName: () => string; stop: () => Promise<void> };
  let recording = false;
  let startedIn = '第一夜';

  beforeEach(() => {
    recording = true;
    startedIn = '第一夜';
    recorder = {
      isRecording: () => recording,
      roomName: () => startedIn,
      stop: vi.fn(async () => {
        recording = false;
      }),
    };

    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '第一夜' } as never);
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, { provide: ReplayRecorderService, useValue: recorder }],
    });
    TestBed.inject(ReplayEventHandlerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not start recording by itself', () => {
    recording = false;
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    expect(recorder.stop).not.toHaveBeenCalled();
  });

  it('closes the recording when the table changes', () => {
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '第二夜' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    expect(recorder.stop).toHaveBeenCalledTimes(1);
  });

  it('closes it on leaving the room', () => {
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    expect(recorder.stop).toHaveBeenCalledTimes(1);
  });

  it('leaves it open while the table stays the same', () => {
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });
    expect(recorder.stop).not.toHaveBeenCalled();
  });

  it('does nothing while nothing is being recorded', () => {
    recording = false;
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    localDispatch('OPEN_NETWORK', { peerId: 'peer-a' });

    expect(recorder.stop).not.toHaveBeenCalled();
  });
});
