import { TestBed } from '@angular/core/testing';
import { CutInSoundService } from '@axe/application/media/cut-in-sound.service';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
import { encodeCutInSounds } from '@axe/domain/media/cut-in-sound';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInSoundService', () => {
  let service: CutInSoundService;
  let store: ObjectStore;
  let played: AudioFile[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();

    played = [];
    vi.spyOn(AudioPlayer.prototype, 'play').mockImplementation((audio?: AudioFile) => {
      if (audio) played.push(audio);
    });
    vi.spyOn(AudioPlayer.prototype, 'stop').mockImplementation(() => {});
    vi.useFakeTimers();

    AudioStorage.instance.add(AudioFile.createEmpty('se-1'));
    AudioStorage.instance.add(AudioFile.createEmpty('se-2'));
    service = TestBed.inject(CutInSoundService);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
    AudioStorage.instance.audios.forEach((audio) => AudioStorage.instance.delete(audio.identifier));
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  function makeScene(sounds: { t: number; a: string; v: number }[], durationMs = 2000): CutInScene {
    const scene = new CutInScene();
    scene.initialize();
    scene.durationMs = durationMs;
    scene.sounds = encodeCutInSounds(sounds);
    const layer = new CutInLayer();
    layer.initialize();
    scene.appendChild(layer);
    return scene;
  }

  it('plays nothing without a scene', () => {
    service.play(null);
    vi.advanceTimersByTime(5000);

    expect(played).toHaveLength(0);
  });

  it('plays each sound where it falls', () => {
    service.play(
      makeScene([
        { t: 0, a: 'se-1', v: 100 },
        { t: 800, a: 'se-2', v: 50 },
      ])
    );

    vi.advanceTimersByTime(0);
    expect(played.map((audio) => audio.identifier)).toEqual(['se-1']);

    vi.advanceTimersByTime(800);
    expect(played.map((audio) => audio.identifier)).toEqual(['se-1', 'se-2']);
  });

  it('leaves behind what the clock has already passed', () => {
    service.play(
      makeScene([
        { t: 0, a: 'se-1', v: 100 },
        { t: 800, a: 'se-2', v: 100 },
      ]),
      400
    );

    vi.advanceTimersByTime(2000);

    expect(played.map((audio) => audio.identifier)).toEqual(['se-2']);
  });

  it('plays them at the volume for effects', () => {
    service.play(makeScene([{ t: 0, a: 'se-1', v: 100 }]));
    vi.advanceTimersByTime(0);

    const player = (service as unknown as { players: Map<string, AudioPlayer> }).players.get('se-1');
    expect(player?.volumeType).toBe(VolumeType.SE);
  });

  it('turns a quiet sound down', () => {
    service.play(makeScene([{ t: 0, a: 'se-1', v: 40 }]));
    vi.advanceTimersByTime(0);

    const player = (service as unknown as { players: Map<string, AudioPlayer> }).players.get('se-1');
    expect(player?.volume).toBeCloseTo(0.4, 5);
  });

  it('says nothing for a sound the room no longer has', () => {
    service.play(makeScene([{ t: 0, a: 'gone', v: 100 }]));
    vi.advanceTimersByTime(100);

    expect(played).toHaveLength(0);
  });

  it('lays them out again each time a scene comes round', () => {
    service.play(makeScene([{ t: 100, a: 'se-1', v: 100 }], 1000), 0, true);

    vi.advanceTimersByTime(100);
    expect(played).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(played).toHaveLength(2);
  });

  it('runs a scene once where it was not told to repeat', () => {
    service.play(makeScene([{ t: 100, a: 'se-1', v: 100 }], 1000));

    vi.advanceTimersByTime(5000);

    expect(played).toHaveLength(1);
  });

  it('says nothing more once it is stopped', () => {
    service.play(makeScene([{ t: 500, a: 'se-1', v: 100 }]));

    service.stop();
    vi.advanceTimersByTime(2000);

    expect(played).toHaveLength(0);
  });

  it('drops what it had booked when it starts again', () => {
    service.play(makeScene([{ t: 500, a: 'se-1', v: 100 }]));
    service.play(makeScene([{ t: 500, a: 'se-2', v: 100 }]));

    vi.advanceTimersByTime(600);

    expect(played.map((audio) => audio.identifier)).toEqual(['se-2']);
  });
});
