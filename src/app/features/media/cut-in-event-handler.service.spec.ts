import { TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitSoundOnlyCutIn, emitStartCutIn } from '@axe/core/event/domain-events';
import { AudioStorage } from '@axe/core/storage/audio-storage';
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
    ...overrides,
  } as unknown as CutIn;
}

describe('CutInEventHandlerService', () => {
  let panelStub: { open: ReturnType<typeof vi.fn> };
  let audioStub: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    panelStub = { open: vi.fn().mockReturnValue({ cutIn: null, forceNoLoop: false, startCutIn: vi.fn() }) };
    audioStub = { get: vi.fn() };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    TestBed.overrideProvider(AudioStorage, { useValue: audioStub });
    TestBed.inject(CutInEventHandlerService);
  });

  it('startCutIn でパネルを開き、コンポーネントへ cutIn を渡す', () => {
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

  it('soundOnlyCutIn: videoId があれば不可視パネルを開く', () => {
    const cutIn = makeCutIn({ videoId: 'youtube123' });
    panelStub.open.mockReturnValue({ cutIn: null, forceNoLoop: false, startCutIn: vi.fn() });

    emitSoundOnlyCutIn({ cutIn });

    expect(panelStub.open).toHaveBeenCalledTimes(1);
    expect(panelStub.open.mock.calls[0][1].invisible).toBe(true);
  });

  it('soundOnlyCutIn: videoId なし & audio が見つからないときは panel/audio とも未実行', () => {
    audioStub.get.mockReturnValue(undefined);
    const cutIn = makeCutIn({ audioIdentifier: 'missing' });

    emitSoundOnlyCutIn({ cutIn });

    expect(audioStub.get).toHaveBeenCalledWith('missing');
    expect(panelStub.open).not.toHaveBeenCalled();
  });

  it('soundOnlyCutIn: null cutIn は何もしない', () => {
    emitSoundOnlyCutIn({ cutIn: null });

    expect(panelStub.open).not.toHaveBeenCalled();
    expect(audioStub.get).not.toHaveBeenCalled();
  });
});
