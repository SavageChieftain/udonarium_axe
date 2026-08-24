import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { cutInPlaybackMs } from '@axe/domain/media/cut-in-playback-window';
import { CutInScene } from '@axe/domain/media/cut-in-scene';

describe('cutInPlaybackMs()', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  function makeCutIn(): CutIn {
    const cutIn = new CutIn();
    cutIn.initialize();
    return cutIn;
  }

  function makeScene(cutIn: CutIn, durationMs: number, withLayer = true): CutInScene {
    const scene = new CutInScene();
    scene.initialize();
    scene.cutInIdentifier = cutIn.identifier;
    scene.durationMs = durationMs;
    if (withLayer) {
      const layer = new CutInLayer();
      layer.initialize();
      scene.appendChild(layer);
    }
    return scene;
  }

  it('stays up for a plain cut-in that was given no play time', () => {
    expect(cutInPlaybackMs(makeCutIn(), null)).toBe(0);
  });

  it('takes the play time it was given, in milliseconds', () => {
    const cutIn = makeCutIn();
    cutIn.outTime = 5;

    expect(cutInPlaybackMs(cutIn, null)).toBe(5000);
  });

  it('lets the play time win over the scene', () => {
    const cutIn = makeCutIn();
    cutIn.outTime = 2;

    expect(cutInPlaybackMs(cutIn, makeScene(cutIn, 8000))).toBe(2000);
  });

  it('runs as long as the scene where nothing else says', () => {
    const cutIn = makeCutIn();

    expect(cutInPlaybackMs(cutIn, makeScene(cutIn, 2500))).toBe(2500);
  });

  it('stays up for a scene told to run again', () => {
    const cutIn = makeCutIn();
    const scene = makeScene(cutIn, 2500);
    scene.sceneLoop = true;

    expect(cutInPlaybackMs(cutIn, scene)).toBe(0);
  });

  it('stays up where the cut-in itself loops', () => {
    const cutIn = makeCutIn();
    cutIn.isLoop = true;

    expect(cutInPlaybackMs(cutIn, makeScene(cutIn, 2500))).toBe(0);
  });

  it('stays up for a scene with nothing laid into it', () => {
    const cutIn = makeCutIn();

    expect(cutInPlaybackMs(cutIn, makeScene(cutIn, 2500, false))).toBe(0);
  });
});
