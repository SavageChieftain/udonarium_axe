import { ImageLayer, MapScene, sceneHeightPx, sceneWidthPx } from '@axe/features/map-editor/model/scene';
import { imageBox } from '@axe/features/tabletop/white-board/white-board-scene';

export interface LivePicture {
  id: string;
  imageIdentifier: string;
  left: number;
  top: number;
  width: number;
  height: number;
  transform: string;
  opacity: number;
}

/**
 * The pictures on a board that have to be hung rather than painted.
 *
 * What the board wears is one flat picture, and a flat picture does not move. A drawing that
 * moves is left out of it and hung over the top instead, in the place the paint would have
 * put it. One cropped or cut to the cells is not: the paint can do those and a hung picture
 * cannot, so it keeps its place in the picture and stands still.
 */
export function livePicturesOf(
  scene: MapScene | null,
  boardWidth: number,
  boardHeight: number,
  isAnimated: (imageIdentifier: string) => boolean
): LivePicture[] {
  if (!scene || boardWidth <= 0 || boardHeight <= 0) return [];

  const sceneWidth = sceneWidthPx(scene);
  const sceneHeight = sceneHeightPx(scene);
  if (sceneWidth <= 0 || sceneHeight <= 0) return [];

  // The board wears its picture at bg-contain, so what is hung over it is placed the same way.
  const scale = Math.min(boardWidth / sceneWidth, boardHeight / sceneHeight);
  const offsetX = (boardWidth - sceneWidth * scale) / 2;
  const offsetY = (boardHeight - sceneHeight * scale) / 2;

  const hung: LivePicture[] = [];
  for (const layer of scene.layers) {
    if (layer.kind !== 'image' || !layer.visible) continue;
    for (const item of (layer as ImageLayer).items) {
      if (!isHangable(item.imageIdentifier, item.crop, item.clipToCells, isAnimated)) continue;
      const box = imageBox(item);
      hung.push({
        id: item.id,
        imageIdentifier: item.imageIdentifier,
        left: offsetX + box.x * scale,
        top: offsetY + box.y * scale,
        width: box.w * scale,
        height: box.h * scale,
        transform: transformOf(item.rotation, item.flipX, item.flipY),
        opacity: alphaOf(layer.opacity) * alphaOf(item.opacity),
      });
    }
  }
  return hung;
}

/** The same reading of the scene the board uses, so that what is hung is never also painted. */
export function isHangable(
  imageIdentifier: string,
  crop: { w: number; h: number } | undefined,
  clipToCells: boolean | undefined,
  isAnimated: (imageIdentifier: string) => boolean
): boolean {
  if (!imageIdentifier || !isAnimated(imageIdentifier)) return false;
  if (clipToCells) return false;
  return !(crop && crop.w > 0 && crop.h > 0);
}

function transformOf(rotation: number, flipX?: boolean, flipY?: boolean): string {
  const parts: string[] = [];
  if (Number.isFinite(rotation) && rotation !== 0) parts.push(`rotate(${rotation}deg)`);
  if (flipX || flipY) parts.push(`scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`);
  return parts.join(' ');
}

function alphaOf(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}
