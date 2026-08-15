import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement } from '@axe/domain/data/data-element';
import {
  ambienceColorOf,
  ambienceDensityOf,
  type AmbienceKind,
  ambienceKindOf,
  DEFAULT_AMBIENCE_DENSITY,
} from '@axe/domain/effect/ambience/ambience-kind';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

/**
 * An effect laid over one part of the board and left there, such as a poisoned marsh or a vent in the ground.
 *
 * Like a mask it is a child of the table, so it changes with the map.
 */
@SyncObject('table-ambience')
export class TableAmbience extends TabletopObject {
  @SyncVar() ambienceKind: string = 'swamp';
  /** Empty for the colour of its kind. */
  @SyncVar() ambienceColor: string = '';
  @SyncVar() ambienceDensity: number = DEFAULT_AMBIENCE_DENSITY;
  @SyncVar() isLock: boolean = false;

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

  get kind(): AmbienceKind {
    return ambienceKindOf(this.ambienceKind, 'swamp');
  }

  get color(): string {
    return ambienceColorOf(this.kind, this.ambienceColor);
  }

  get density(): number {
    return ambienceDensityOf(this.ambienceDensity);
  }

  /**
   * How far the repetition is offset, in milliseconds.
   * Several of these side by side all moving together would look pasted on.
   */
  get phaseOffset(): number {
    let hash = 0;
    for (let index = 0; index < this.identifier.length; index++) {
      hash = (hash * 31 + this.identifier.charCodeAt(index)) % 100000;
    }
    return hash;
  }

  static create(name: string, kind: AmbienceKind, width: number, height: number, identifier?: string): TableAmbience {
    const object = identifier ? new TableAmbience(identifier) : new TableAmbience();
    object.createDataElements();

    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('width', width, {}, `width_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('height', height, {}, `height_${object.identifier}`));
    object.ambienceKind = kind;
    object.initialize();

    return object;
  }
}
