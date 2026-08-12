import { inject, Injectable } from '@angular/core';
import { Logger } from '@axe/core/logging/logger';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { downloadBlob } from '@axe/core/util/download-blob';
import type { ReplayCastMember } from '@axe/domain/replay/replay-cast';
import { buildTablePhotoLayout } from '@axe/domain/replay/table-photo';
import { toDrawableImage } from '@axe/infrastructure/replay/drawable-image';
import type { ReplayFrameImage } from '@axe/infrastructure/replay/replay-frame-painter';
import { paintTablePhoto } from '@axe/infrastructure/replay/table-photo-painter';

export interface TablePhotoRequest {
  cast: readonly ReplayCastMember[];
  roomName: string;
  /** 見出しの下に焼き込む一行。日付の書き方は画面の言葉に合わせるので、呼ぶ側が決める。 */
  subtitle: string;
  fileName: string;
}

export interface TablePhotoResult {
  saved: boolean;
  /** 紙に入りきらず写らなかった人数。 */
  omitted: number;
}

/**
 * その卓の記念写真。
 *
 * 立ち絵をこのブラウザから読み、1 枚の PNG にして渡す。
 * 絵が残っていないコマは枠と名前だけになる — 写真から外すと、居たことまで消える。
 */
@Injectable({ providedIn: 'root' })
export class ReplayPhotoService {
  private readonly imageStorage = inject(ImageStorage);

  async save(request: TablePhotoRequest): Promise<TablePhotoResult> {
    const layout = buildTablePhotoLayout(
      request.cast.map((member) => ({
        identifier: member.identifier,
        name: member.name,
        imageIdentifier: member.imageIdentifier,
      }))
    );
    if (layout.cells.length < 1) return { saved: false, omitted: 0 };

    const images = await this.loadImages(layout.cells.map((cell) => cell.imageIdentifier));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = layout.width;
      canvas.height = layout.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { saved: false, omitted: layout.omitted };

      paintTablePhoto(
        ctx,
        layout,
        { imageOf: (identifier) => images.get(identifier) ?? null },
        request.roomName,
        request.subtitle
      );

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((result) => resolve(result), 'image/png'));
      if (!blob) return { saved: false, omitted: layout.omitted };

      downloadBlob(blob, `${request.fileName}.png`);
      return { saved: true, omitted: layout.omitted };
    } finally {
      // 読んだ絵は必ず手放す。描き損ねた回ほど、抱えたまま溜まっていく。
      for (const image of images.values()) image.close?.();
    }
  }

  private async loadImages(
    identifiers: readonly string[]
  ): Promise<Map<string, ReplayFrameImage & { close?(): void }>> {
    const loaded = new Map<string, ReplayFrameImage & { close?(): void }>();
    const wanted = [...new Set(identifiers.filter((identifier) => identifier.length > 0))];

    // 1 枚ずつ待つと人数分だけ待たされる。読むのは互いに無関係なので、まとめて読む。
    const decoded = await Promise.all(
      wanted.map(async (identifier) => {
        const image = this.imageStorage.get(identifier);
        if (!image) {
          Logger.warn('[TablePhoto] この絵はこのブラウザに残っていません', identifier);
          return null;
        }
        try {
          return await toDrawableImage(image.blob, image.url);
        } catch (reason) {
          Logger.warn('[TablePhoto] 絵を読めませんでした', identifier, reason);
          return null;
        }
      })
    );

    for (const [index, drawable] of decoded.entries()) {
      if (drawable) loaded.set(wanted[index], drawable);
    }
    return loaded;
  }
}
