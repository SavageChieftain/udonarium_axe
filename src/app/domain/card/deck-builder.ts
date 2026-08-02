import { ImageFile } from '@axe/core/storage/image-file';
import { DataElement } from '@axe/domain/data/data-element';

const IMAGE_EXTENSION_PATTERN = /\.[a-z0-9]+$/i;

export interface DeckCardSource {
  identifier: string;
  name: string;
}

/** 画像 1 枚がカード 1 枚になる。名前は画像名から拡張子を落としたもの。 */
export function toDeckCardSources(images: readonly ImageFile[], fallbackName: string): DeckCardSource[] {
  return images
    .filter((image) => image.identifier.length > 0)
    .map((image) => ({
      identifier: image.identifier,
      name: cardNameOf(image, fallbackName),
    }));
}

function cardNameOf(image: ImageFile, fallbackName: string): string {
  const name = (image.name ?? '').trim().replace(IMAGE_EXTENSION_PATTERN, '');
  return name.length > 0 ? name : fallbackName;
}

/**
 * 見本カードの詳細項目の「枠」を、値を初期化したうえで複製する。
 * 同名の項目が既にあるカードには足さない。
 */
export function copyDetailSchema(from: DataElement | null, to: DataElement | null): DataElement[] {
  if (!from || !to) return [];

  const existing = new Set(to.children.map((child) => (child as DataElement).name));
  const added: DataElement[] = [];
  for (const child of from.children) {
    const element = child as DataElement;
    if (existing.has(element.name)) continue;
    const clone = element.clone() as DataElement;
    to.appendChild(clone);
    added.push(clone);
  }
  return added;
}
