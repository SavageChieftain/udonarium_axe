import { TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitSoundOnlyCutIn, emitStartCutIn } from '@axe/core/event/domain-events';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInEventHandlerService } from '@axe/features/media/cut-in-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function makeCutIn(overrides: Partial<CutIn> = {}): CutIn {
  return {
    identifier: 'cut-1',
    name: 'sample',
    width: 320,
    height: 240,
    x_pos: 50,
    y_pos: 50,
    videoId: '',
    audioIdentifier: '',
    frameless: false,
    ...overrides,
  } as unknown as CutIn;
}

describe('CutInEventHandlerService', () => {
  let panelStub: { open: ReturnType<typeof vi.fn> };
  let audioStub: { get: ReturnType<typeof vi.fn> };
  let service: CutInEventHandlerService;

  beforeEach(() => {
    panelStub = { open: vi.fn().mockReturnValue({ cutIn: null, forceNoLoop: false, startCutIn: vi.fn() }) };
    audioStub = { get: vi.fn() };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    TestBed.overrideProvider(AudioStorage, { useValue: audioStub });
    service = TestBed.inject(CutInEventHandlerService);
  });

  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  it('opens a panel and hands the cut-in to it', () => {
    const cutIn = makeCutIn({ name: 'attack' });
    const componentMock = { cutIn: null, forceNoLoop: true, startCutIn: vi.fn() };
    panelStub.open.mockReturnValue(componentMock);

    emitStartCutIn({ cutIn });

    expect(panelStub.open).toHaveBeenCalledTimes(1);
    expect(panelStub.open.mock.calls[0][1].title).toContain('attack');
    expect(componentMock.cutIn).toBe(cutIn);
    expect(componentMock.forceNoLoop).toBe(false);
    expect(componentMock.startCutIn).toHaveBeenCalled();
  });

  it('leaves room above a framed cut-in for the title bar', () => {
    emitStartCutIn({ cutIn: makeCutIn() });

    expect(panelStub.open.mock.calls[0][1].height).toBe(265);
    expect(panelStub.open.mock.calls[0][1].frameless).toBe(false);
  });

  it('gives a frameless cut-in the whole panel', () => {
    emitStartCutIn({ cutIn: makeCutIn({ frameless: true }) });

    expect(panelStub.open.mock.calls[0][1].height).toBe(240);
    expect(panelStub.open.mock.calls[0][1].frameless).toBe(true);
  });

  it('opens an invisible panel for a sound-only cut-in carrying a video', () => {
    const cutIn = makeCutIn({ videoId: 'youtube123' });
    panelStub.open.mockReturnValue({ cutIn: null, forceNoLoop: false, startCutIn: vi.fn() });

    emitSoundOnlyCutIn({ cutIn });

    expect(panelStub.open).toHaveBeenCalledTimes(1);
    expect(panelStub.open.mock.calls[0][1].invisible).toBe(true);
  });

  it('opens nothing and plays nothing for a sound-only cut-in with neither', () => {
    audioStub.get.mockReturnValue(undefined);
    const cutIn = makeCutIn({ audioIdentifier: 'missing' });

    emitSoundOnlyCutIn({ cutIn });

    expect(audioStub.get).toHaveBeenCalledWith('missing');
    expect(panelStub.open).not.toHaveBeenCalled();
  });

  it('does nothing for a missing cut-in', () => {
    emitSoundOnlyCutIn({ cutIn: null });

    expect(panelStub.open).not.toHaveBeenCalled();
    expect(audioStub.get).not.toHaveBeenCalled();
  });

  it('plays a sound-effect-tagged cut-in through the effects volume', () => {
    vi.spyOn(AudioPlayer.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(AudioPlayer.prototype, 'stop').mockImplementation(() => {});
    audioStub.get.mockReturnValue({ identifier: 'se-id' });
    const tag = AudioTag.create('se-id');
    tag.tag = 'SE';

    emitSoundOnlyCutIn({ cutIn: makeCutIn({ audioIdentifier: 'se-id' }) });

    const player = (service as unknown as { soundOnlyPlayer: AudioPlayer }).soundOnlyPlayer;
    expect(player.volumeType).toBe(VolumeType.SE);
  });

  it('plays any other sound-only cut-in through the master volume', () => {
    vi.spyOn(AudioPlayer.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(AudioPlayer.prototype, 'stop').mockImplementation(() => {});
    audioStub.get.mockReturnValue({ identifier: 'bgm-id' });

    emitSoundOnlyCutIn({ cutIn: makeCutIn({ audioIdentifier: 'bgm-id' }) });

    const player = (service as unknown as { soundOnlyPlayer: AudioPlayer }).soundOnlyPlayer;
    expect(player.volumeType).toBe(VolumeType.MASTER);
  });
});
