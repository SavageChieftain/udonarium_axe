import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function makeReadyAudio(identifier: string): AudioFile {
  const audio = AudioFile.createEmpty(identifier);
  const ctx = (audio as unknown as { context: Record<string, unknown> }).context;
  ctx['blob'] = new Blob(['x']);
  ctx['url'] = 'blob:x';
  return audio;
}

describe('CutInWindowComponent', () => {
  let component: CutInWindowComponent;
  let fixture: ComponentFixture<CutInWindowComponent>;
  let store: ObjectStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    fixture = TestBed.createComponent(CutInWindowComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    AudioStorage.instance.audios.forEach((a) => AudioStorage.instance.delete(a.identifier));
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('videoVolume', () => {
    it('カットイン個別音量をそのままYouTube API音量として返す', () => {
      const cutIn = new CutIn('volume-test');
      cutIn.initialize();
      cutIn.videoVolume = 75;
      component.cutIn = cutIn;

      expect(component.videoVolume).toBe(75);
    });

    it('テスト再生時も個別音量をそのまま返す', () => {
      const cutIn = new CutIn('audition-volume-test');
      cutIn.initialize();
      cutIn.videoVolume = 50;
      component.cutIn = cutIn;
      component.isTest = true;

      expect(component.videoVolume).toBe(50);
    });
  });

  describe('startCutIn — 音量タイプ', () => {
    it('SE タグの音声は volumeType=SE で再生する', () => {
      vi.spyOn(AudioPlayer.prototype, 'play').mockImplementation(() => {});
      vi.spyOn(AudioPlayer.prototype, 'stop').mockImplementation(() => {});
      AudioStorage.instance.add(makeReadyAudio('cutin-se'));
      const tag = AudioTag.create('cutin-se');
      tag.tag = 'SE';

      const cutIn = new CutIn('cutin-se-test');
      cutIn.initialize();
      cutIn.audioIdentifier = 'cutin-se';
      component.cutIn = cutIn;

      component.startCutIn();

      expect(component.audioPlayer.volumeType).toBe(VolumeType.SE);
    });

    it('SE タグでない音声は volumeType=MASTER で再生する', () => {
      vi.spyOn(AudioPlayer.prototype, 'play').mockImplementation(() => {});
      vi.spyOn(AudioPlayer.prototype, 'stop').mockImplementation(() => {});
      AudioStorage.instance.add(makeReadyAudio('cutin-bgm'));

      const cutIn = new CutIn('cutin-bgm-test');
      cutIn.initialize();
      cutIn.audioIdentifier = 'cutin-bgm';
      component.cutIn = cutIn;

      component.startCutIn();

      expect(component.audioPlayer.volumeType).toBe(VolumeType.MASTER);
    });
  });

  describe('ngOnDestroy', () => {
    it('cutInTimeOut が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { cutInTimeOut: ReturnType<typeof setTimeout> | null };
      priv.cutInTimeOut = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.cutInTimeOut).toBeNull();
    });

    it('timerCheckWindowSize が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      component.timerCheckWindowSize = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(component.timerCheckWindowSize).toBeNull();
    });

    it('_timeoutIdVideo が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { _timeoutIdVideo: ReturnType<typeof setTimeout> | null };
      priv._timeoutIdVideo = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv._timeoutIdVideo).toBeNull();
    });
  });
});
