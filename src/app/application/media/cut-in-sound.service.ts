import { DestroyRef, inject, Injectable } from '@angular/core';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import type { CutInScene } from '@axe/domain/media/cut-in-scene';
import type { CutInSound } from '@axe/domain/media/cut-in-sound';

/**
 * The sounds a scene drops, played where they fall.
 *
 * Each one is set going by its own timer rather than by watching the clock, so nothing
 * has to run between them. A scene that repeats has its sounds laid out again each time
 * round, which is also what keeps a long scene from booking hundreds of timers at once.
 */
@Injectable({ providedIn: 'root' })
export class CutInSoundService {
  private readonly audioStorage = inject(AudioStorage);
  private readonly destroyRef = inject(DestroyRef);

  private readonly players = new Map<string, AudioPlayer>();
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Sets the sounds of a scene going, from wherever the clock stands. */
  play(scene: CutInScene | null, fromMs = 0, loop = false): void {
    this.stop();
    if (!scene) return;

    const runningMs = scene.runningMs;
    this.schedule(scene.soundList, fromMs, runningMs, loop ? runningMs : 0);
  }

  stop(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    for (const player of this.players.values()) player.stop();
  }

  private schedule(sounds: readonly CutInSound[], fromMs: number, runningMs: number, loopMs: number): void {
    for (const sound of sounds) {
      if (sound.t < fromMs) continue;
      this.timers.push(setTimeout(() => this.ring(sound), sound.t - fromMs));
    }

    if (loopMs <= 0) return;
    // Laid out again from the top rather than booked to the end of time.
    this.timers.push(setTimeout(() => this.schedule(sounds, 0, runningMs, loopMs), Math.max(1, loopMs - fromMs)));
  }

  private ring(sound: CutInSound): void {
    const audio = this.audioStorage.get(sound.a);
    if (!audio) return;

    const player = this.playerFor(sound.a);
    player.volumeType = VolumeType.SE;
    player.loop = false;
    player.volume = Math.min(1, Math.max(0, sound.v / 100));
    player.play(audio);
  }

  private playerFor(identifier: string): AudioPlayer {
    const known = this.players.get(identifier);
    if (known) return known;

    const player = new AudioPlayer();
    this.players.set(identifier, player);
    return player;
  }
}
