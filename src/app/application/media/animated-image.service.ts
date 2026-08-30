import { inject, Injectable, signal } from '@angular/core';
import { isAnimatedImageBytes } from '@axe/core/storage/animated-image';
import { ImageStorage } from '@axe/core/storage/image-storage';

/** How much of a file has to be read to find out whether it moves. */
const HEAD_BYTES = 64 * 1024;

/**
 * Remembers which pictures move.
 *
 * The answer is in the bytes rather than in anything the storehouse knows, so it is read
 * once per picture and kept. Until it is read a picture is taken as still, and whatever
 * asked is told again when the bytes come back.
 */
@Injectable({ providedIn: 'root' })
export class AnimatedImageService {
  private readonly imageStorage = inject(ImageStorage);
  private readonly answers = signal<ReadonlyMap<string, boolean>>(new Map());
  private readonly asking = new Set<string>();

  isAnimated(identifier: string): boolean {
    const known = this.answers().get(identifier);
    if (known !== undefined) return known;
    void this.probe(identifier);
    return false;
  }

  async probe(identifier: string): Promise<boolean> {
    const known = this.answers().get(identifier);
    if (known !== undefined) return known;
    if (this.asking.has(identifier)) return false;
    this.asking.add(identifier);

    let animated = false;
    try {
      animated = isAnimatedImageBytes(await this.headOf(identifier));
    } catch {
      /* a picture that cannot be read is drawn as it always was */
    } finally {
      this.asking.delete(identifier);
      this.answers.update((current) => new Map(current).set(identifier, animated));
    }
    return animated;
  }

  private async headOf(identifier: string): Promise<ArrayBuffer> {
    const file = this.imageStorage.get(identifier);
    const url = file?.url ?? '';
    if (!url) return new ArrayBuffer(0);
    const response = await fetch(url);
    const blob = await response.blob();
    return blob.slice(0, HEAD_BYTES).arrayBuffer();
  }
}
