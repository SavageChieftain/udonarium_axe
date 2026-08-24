import type { CutIn } from '@axe/domain/media/cut-in';
import type { CutInScene } from '@axe/domain/media/cut-in-scene';
import { sceneDurationOf } from '@axe/domain/media/cut-in-scene-timeline';

/**
 * How long a cut-in stays up, in ms, where zero means it stays until something else
 * takes it away.
 *
 * A play time set by hand always wins. Without one, a cut-in built out of layers knows
 * its own length and closes when the scene has run, unless it was told to run again.
 */
export function cutInPlaybackMs(cutIn: CutIn, scene: CutInScene | null | undefined): number {
  const outTime = Number(cutIn.outTime);
  if (Number.isFinite(outTime) && outTime > 0) return outTime * 1000;

  if (!scene || scene.layers.length < 1) return 0;
  if (scene.sceneLoop || cutIn.isLoop) return 0;

  return sceneDurationOf(scene);
}
