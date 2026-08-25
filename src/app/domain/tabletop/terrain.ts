import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement } from '@axe/domain/data/data-element';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  DEFAULT_LIGHT_COLOR,
  LightAnimation,
  LightCategory,
  LightPreset,
  LightSpec,
} from '@axe/domain/tabletop/vision-types';

export enum TerrainViewState {
  NULL = 0,
  FLOOR = 1,
  WALL = 2,
  ALL = 3,
}

export enum SlopeDirection {
  NONE = 0,
  TOP = 1,
  BOTTOM = 2,
  LEFT = 3,
  RIGHT = 4,
}

export type TerrainFace = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

export const TERRAIN_FACES: readonly TerrainFace[] = ['top', 'bottom', 'north', 'south', 'east', 'west'] as const;

@SyncObject('terrain')
export class Terrain extends TabletopObject {
  @SyncVar() isLocked: boolean = false;
  @SyncVar() mode: TerrainViewState = TerrainViewState.ALL;
  @SyncVar() rotate: number = 0;
  @SyncVar() isDropShadow: boolean = true;
  @SyncVar() isSlope: boolean = false;
  @SyncVar() isSurfaceShading: boolean = true;
  @SyncVar() slopeDirection: number = SlopeDirection.NONE;

  @SyncVar() isGrid: boolean = false;
  @SyncVar() isTiledTexture: boolean = false;

  @SyncVar() blocksSight: boolean = true;
  @SyncVar() blocksLight: boolean = true;

  @SyncVar() lightEnabled: boolean = false;
  @SyncVar() lightPreset: string = LightPreset.CUSTOM;
  @SyncVar() lightBrightRadius: number = 0;
  @SyncVar() lightDimRadius: number = 0;
  @SyncVar() lightColor: string = DEFAULT_LIGHT_COLOR;
  @SyncVar() lightAngle: number = 360;
  @SyncVar() lightDirection: number = 0;
  @SyncVar() lightPitch: number = 0;
  @SyncVar() lightAnimation: string = LightAnimation.NONE;

  get lightSpec(): LightSpec {
    return {
      enabled: this.lightEnabled,
      preset: this.lightPreset as LightPreset,
      brightRadius: this.lightBrightRadius,
      dimRadius: this.lightDimRadius,
      color: this.lightColor,
      angle: this.lightAngle,
      direction: this.rotate + this.lightDirection,
      pitch: this.lightPitch,
      animation: this.lightAnimation as LightAnimation,
      category: LightCategory.PHYSICAL,
      ignoreOcclusion: false,
      revealToAll: false,
      castShadows: true,
    };
  }

  get width(): number {
    return this.getCommonValue('width', 1);
  }
  set width(width: number) {
    this.setCommonValue('width', width);
  }
  get height(): number {
    return this.getCommonValue('height', 1);
  }
  set height(height: number) {
    this.setCommonValue('height', height);
  }
  get depth(): number {
    return this.getCommonValue('depth', 1);
  }
  set depth(depth: number) {
    this.setCommonValue('depth', depth);
  }
  get wallImage(): ImageFile | null {
    return this.getImageFile('wall');
  }
  get floorImage(): ImageFile | null {
    return this.getImageFile('floor');
  }

  get topImage(): ImageFile | null {
    return this.getImageFile('top') ?? this.floorImage;
  }
  get bottomImage(): ImageFile | null {
    return this.getImageFile('bottom') ?? this.floorImage;
  }
  get northImage(): ImageFile | null {
    return this.getImageFile('north') ?? this.wallImage;
  }
  get southImage(): ImageFile | null {
    return this.getImageFile('south') ?? this.wallImage;
  }
  get eastImage(): ImageFile | null {
    return this.getImageFile('east') ?? this.wallImage;
  }
  get westImage(): ImageFile | null {
    return this.getImageFile('west') ?? this.wallImage;
  }

  faceImage(face: TerrainFace): ImageFile | null {
    switch (face) {
      case 'top':
        return this.topImage;
      case 'bottom':
        return this.bottomImage;
      case 'north':
        return this.northImage;
      case 'south':
        return this.southImage;
      case 'east':
        return this.eastImage;
      case 'west':
        return this.westImage;
    }
  }

  setFaceImage(face: TerrainFace, imageIdentifier: string): void {
    const imageEl = this.imageDataElement;
    if (!imageEl) return;
    const existing = this.getElement(face, imageEl);
    if (existing) {
      existing.value = imageIdentifier;
      return;
    }
    imageEl.appendChild(DataElement.create(face, imageIdentifier, { type: 'image' }, `${face}_${this.identifier}`));
  }

  get hasWall(): boolean {
    return (this.mode & TerrainViewState.WALL) !== 0;
  }
  get hasFloor(): boolean {
    return (this.mode & TerrainViewState.FLOOR) !== 0;
  }

  static create(
    name: string,
    width: number,
    depth: number,
    height: number,
    wall: string,
    floor: string,
    identifier?: string
  ): Terrain {
    let object: Terrain;

    if (identifier) {
      object = new Terrain(identifier);
    } else {
      object = new Terrain();
    }
    object.createDataElements();

    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('width', width, {}, `width_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('height', height, {}, `height_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('depth', depth, {}, `depth_${object.identifier}`));
    object.imageDataElement!.appendChild(
      DataElement.create('wall', wall, { type: 'image' }, `wall_${object.identifier}`)
    );
    object.imageDataElement!.appendChild(
      DataElement.create('floor', floor, { type: 'image' }, `floor_${object.identifier}`)
    );
    object.initialize();

    return object;
  }
}
