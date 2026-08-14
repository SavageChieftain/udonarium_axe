import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { FillStyle, MapScene } from '@axe/features/map-editor/model/scene';
import {
  packSceneArchive,
  remapSceneImageIdentifiers,
  unpackSceneArchive,
} from '@axe/features/map-editor/model/scene-archive';
import { deserializeScene, serializeScene } from '@axe/features/map-editor/model/serialize';
import { imageTextureIdentifier, isImageTextureId, TEXTURE_IMAGE_TAG } from '@axe/features/map-editor/model/textures';

/**
 * 地図が使っている絵。塗りに使う模様と、貼り付けた絵とで置き場が違う。
 *
 * 持ち出すときはこの一覧ぶんだけを書庫へ入れる。地図に出てこない絵まで
 * 抱き合わせると、受け取った側の置き場が無関係な絵で埋まる。
 */
export function collectSceneImageIds(scene: MapScene): { textureIds: Set<string>; imageIds: Set<string> } {
  const textureIds = new Set<string>();
  const imageIds = new Set<string>();

  const addFill = (fill: FillStyle | null | undefined): void => {
    if (fill && fill.type === 'texture' && fill.textureId && isImageTextureId(fill.textureId)) {
      textureIds.add(imageTextureIdentifier(fill.textureId));
    }
  };

  for (const layer of scene.layers) {
    if (layer.kind === 'cell') {
      for (const fill of Object.values(layer.cells)) addFill(fill as FillStyle);
    } else if (layer.kind === 'shape') {
      for (const item of layer.items) {
        addFill(item.fill);
        addFill(item.stroke?.fill);
      }
    } else if (layer.kind === 'image') {
      for (const item of layer.items) imageIds.add(item.imageIdentifier);
    }
  }
  return { textureIds, imageIds };
}

async function bytesOf(imageStorage: ImageStorage, ids: Set<string>): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  for (const id of ids) {
    const blob = imageStorage.get(id)?.blob;
    if (!blob) continue;
    out[id] = new Uint8Array(await blob.arrayBuffer());
  }
  return out;
}

/** 地図と、それが使っている絵を 1 つの書庫にまとめる。 */
export async function packSceneWithImages(scene: MapScene, imageStorage: ImageStorage): Promise<Uint8Array> {
  const { textureIds, imageIds } = collectSceneImageIds(scene);
  return packSceneArchive(
    serializeScene(scene),
    await bytesOf(imageStorage, textureIds),
    await bytesOf(imageStorage, imageIds)
  );
}

async function registerImages(
  imageStorage: ImageStorage,
  bytes: Record<string, Uint8Array>,
  asTexture: boolean
): Promise<Map<string, string>> {
  const registered = new Map<string, string>();
  for (const [oldId, data] of Object.entries(bytes)) {
    const blob = new Blob([data.slice()], { type: 'image/webp' });
    const imageFile = await imageStorage.addAsync(blob);
    registered.set(oldId, imageFile.identifier);
    if (asTexture && !ImageTag.get(imageFile.identifier)) {
      const tag = ImageTag.create(imageFile.identifier);
      tag.tag = TEXTURE_IMAGE_TAG;
    }
  }
  return registered;
}

/**
 * 書庫から地図を取り出し、中の絵を手元の置き場へ入れ直す。
 *
 * 絵の名札は入れた先で新しく振られるので、地図側の参照も付け替える。
 * 読めない書庫だったときは null。
 */
export async function unpackSceneWithImages(
  buffer: Uint8Array,
  imageStorage: ImageStorage,
  onTexturesAdded?: () => void
): Promise<MapScene | null> {
  const unpacked = unpackSceneArchive(buffer);
  if (!unpacked) return null;

  const scene = deserializeScene(unpacked.json);
  if (!scene) return null;

  const textures = await registerImages(imageStorage, unpacked.textures, true);
  const images = await registerImages(imageStorage, unpacked.images, false);
  if (textures.size > 0) onTexturesAdded?.();

  remapSceneImageIdentifiers(scene, new Map([...textures, ...images]));
  return scene;
}
