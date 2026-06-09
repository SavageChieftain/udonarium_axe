import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectStore } from '@axe/core/sync/object-store';
import { generateUuid } from '@axe/core/util/uuid';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { centerFollowerOnCharacter } from '@axe/domain/tabletop/following';
import { OwnedTabletopObject } from '@axe/domain/tabletop/owned-tabletop-object';
import {
  DEFAULT_LIGHT_COLOR,
  LightAnimation,
  LightCategory,
  LightPreset,
  LightSpec,
} from '@axe/domain/tabletop/vision-types';

@SyncObject('light-source')
export class LightSource extends OwnedTabletopObject {
  constructor(identifier: string = generateUuid()) {
    super(identifier);
    this.isAltitudeIndicate = true;
  }

  @SyncVar() owner: string = '';
  @SyncVar() isLock: boolean = false;

  @SyncVar() lightEnabled: boolean = true;
  @SyncVar() lightPreset: string = LightPreset.CUSTOM;
  @SyncVar() lightBrightRadius: number = 4;
  @SyncVar() lightDimRadius: number = 8;
  @SyncVar() lightColor: string = DEFAULT_LIGHT_COLOR;
  @SyncVar() lightAngle: number = 360;
  @SyncVar() lightDirection: number = 0;
  @SyncVar() lightPitch: number = 0;
  @SyncVar() lightAnimation: string = LightAnimation.NONE;
  @SyncVar() lightCategory: string = LightCategory.PHYSICAL;
  @SyncVar() lightIgnoreOcclusion: boolean = false;
  @SyncVar() lightRevealToAll: boolean = false;
  @SyncVar() lightCastShadows: boolean = true;
  @SyncVar() followingCharacterIdentifier: string = '';
  @SyncVar() followingCounterDummy: number = 0;

  gridSize: number = 50;

  get rotate(): number {
    return this.lightDirection;
  }
  set rotate(value: number) {
    this.lightDirection = value;
  }

  get lightSpec(): LightSpec {
    return {
      enabled: this.lightEnabled,
      preset: this.lightPreset as LightPreset,
      brightRadius: this.lightBrightRadius,
      dimRadius: this.lightDimRadius,
      color: this.lightColor,
      angle: this.lightAngle,
      direction: this.lightDirection,
      pitch: this.lightPitch,
      animation: this.lightAnimation as LightAnimation,
      category: this.lightCategory as LightCategory,
      ignoreOcclusion: this.lightIgnoreOcclusion,
      revealToAll: this.lightRevealToAll,
      castShadows: this.lightCastShadows,
    };
  }

  following(): void {
    const character = ObjectStore.instance.get<GameCharacter>(this.followingCharacterIdentifier);
    if (!character) {
      this.followingCharacterIdentifier = '';
      return;
    }
    centerFollowerOnCharacter(this, character, this.gridSize);
    this.followingCounterDummy = (this.followingCounterDummy + 1) % 50;
  }

  static create(name: string, identifier?: string): LightSource {
    const object = identifier ? new LightSource(identifier) : new LightSource();
    object.createDataElements();
    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.initialize();
    return object;
  }
}
