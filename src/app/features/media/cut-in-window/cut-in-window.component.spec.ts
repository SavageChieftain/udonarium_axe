import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
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
    it('passes a cut-ins own volume straight to the video player', () => {
      const cutIn = new CutIn('volume-test');
      cutIn.initialize();
      cutIn.videoVolume = 75;
      component.cutIn = cutIn;

      expect(component.videoVolume).toBe(75);
    });

    it('passes it through on a test play as well', () => {
      const cutIn = new CutIn('audition-volume-test');
      cutIn.initialize();
      cutIn.videoVolume = 50;
      component.cutIn = cutIn;
      component.isTest = true;

      expect(component.videoVolume).toBe(50);
    });
  });

  describe('which volume a cut-in plays through', () => {
    it('plays a sound-effect-tagged cut-in through the effects volume', () => {
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

    it('plays any other through the master volume', () => {
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
    it('clears the cut-in timer on teardown', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { cutInTimeOut: ReturnType<typeof setTimeout> | null };
      priv.cutInTimeOut = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.cutInTimeOut).toBeNull();
    });

    it('clears the window size timer on teardown', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      component.timerCheckWindowSize = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(component.timerCheckWindowSize).toBeNull();
    });

    it('clears the video timer on teardown', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { _timeoutIdVideo: ReturnType<typeof setTimeout> | null };
      priv._timeoutIdVideo = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv._timeoutIdVideo).toBeNull();
    });
  });

  describe('a cut-in built out of layers', () => {
    function makeCutIn(): CutIn {
      const cutIn = new CutIn();
      cutIn.initialize();
      component.cutIn = cutIn;
      return cutIn;
    }

    function giveScene(cutIn: CutIn, withLayer: boolean): CutInScene {
      const scene = new CutInScene();
      scene.initialize();
      scene.cutInIdentifier = cutIn.identifier;
      if (withLayer) {
        const layer = new CutInLayer();
        layer.initialize();
        scene.appendChild(layer);
      }
      return scene;
    }

    it('shows no stage for a cut-in that is one picture', () => {
      makeCutIn();
      fixture.detectChanges();

      expect(component.scene()).toBeNull();
      expect(fixture.nativeElement.querySelector('app-cut-in-stage')).toBeNull();
    });

    it('shows no stage for a scene with nothing laid into it', () => {
      const cutIn = makeCutIn();
      giveScene(cutIn, false);
      fixture.detectChanges();

      expect(component.scene()).toBeNull();
    });

    it('lays the stage over the picture once there are layers', () => {
      const cutIn = makeCutIn();
      const scene = giveScene(cutIn, true);
      fixture.detectChanges();

      expect(component.scene()).toBe(scene);
      expect(fixture.nativeElement.querySelector('app-cut-in-stage')).not.toBeNull();
    });

    it('closes once the scene has run, without a play time being set', () => {
      vi.useFakeTimers();
      const cutIn = makeCutIn();
      const scene = giveScene(cutIn, true);
      scene.durationMs = 1500;
      const close = vi.spyOn(TestBed.inject(PanelService), 'close').mockImplementation(() => {});

      component.startCutIn();
      vi.advanceTimersByTime(1499);
      expect(close).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2);
      expect(close).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
