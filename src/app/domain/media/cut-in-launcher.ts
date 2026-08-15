import { emitSoundOnlyCutIn, emitStartCutIn, emitStopCutIn, emitStopCutInByBgm } from '@axe/core/event/domain-events';
import { getPeerContext } from '@axe/core/network/peer-context-source';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';

@SyncObject('cut-in-launcher')
export class CutInLauncher extends GameObject {
  @SyncVar() launchCutInIdentifier: string = '';
  @SyncVar() launchTimeStamp: number = 0;
  @SyncVar() launchMySelf = false;
  @SyncVar() launchIsStart: boolean = false;
  @SyncVar() stopBlankTagCutInTimeStamp: number = 0;
  @SyncVar() sendTo: string = '';
  @SyncVar() soundOnlyCutInIdentifier: string = '';
  @SyncVar() soundOnlyTimeStamp: number = 0;

  reloadDummy = 5;
  private isInitialSync = true;

  // The chat trigger and the uploaded music have moved to the cut-in service.
  // This class keeps to the synchronised record of starting, stopping and sound-only launches.

  startSoundOnlyCutIn(cutIn: CutIn, sendTo?: string) {
    this.soundOnlyCutInIdentifier = cutIn.identifier;
    this.soundOnlyTimeStamp = this.soundOnlyTimeStamp + 1;

    if (sendTo) {
      this.sendTo = sendTo;
    } else {
      this.sendTo = '';
    }

    this.startSelfSoundOnly();
  }

  startCutInMySelf(cutIn: CutIn) {
    this.launchCutInIdentifier = cutIn.identifier;
    this.launchIsStart = true;
    this.launchTimeStamp = this.launchTimeStamp + 1;
    this.launchMySelf = true;
    this.sendTo = '';
    this.startSelfCutIn();
  }

  startCutIn(cutIn: CutIn, sendTo?: string) {
    this.launchCutInIdentifier = cutIn.identifier;
    this.launchIsStart = true;
    this.launchTimeStamp = this.launchTimeStamp + 1;
    this.launchMySelf = false;

    if (sendTo) {
      this.sendTo = sendTo;
    } else {
      this.sendTo = '';
    }

    this.startSelfCutIn();
  }

  stopCutIn(cutIn: CutIn) {
    this.launchCutInIdentifier = cutIn.identifier;
    this.launchIsStart = false;
    this.launchTimeStamp = this.launchTimeStamp + 1;
    this.launchMySelf = false;

    this.stopSelfCutIn();
  }

  stopBlankTagCutIn() {
    this.stopBlankTagCutInTimeStamp = this.stopBlankTagCutInTimeStamp + 1;
    emitStopCutInByBgm();
  }

  sameTagCutIn(cutIn: CutIn): CutIn[] {
    const cutIns = this.getCutIns();
    const tagName = cutIn.tagName;
    const sameTagCutIn: CutIn[] = [];
    for (const cutIn_ of cutIns) {
      if (cutIn_.tagName == tagName && cutIn_.identifier !== cutIn.identifier) {
        sameTagCutIn.push(cutIn_);
      }
    }
    return sameTagCutIn;
  }

  startSelfCutIn() {
    const cutIn_ = ObjectStore.instance.get(this.launchCutInIdentifier);
    emitStartCutIn({ cutIn: cutIn_ });
  }

  startSelfSoundOnly() {
    const cutIn_ = ObjectStore.instance.get(this.soundOnlyCutInIdentifier);
    emitSoundOnlyCutIn({ cutIn: cutIn_ });
  }

  stopSelfCutIn() {
    const cutIn_ = ObjectStore.instance.get(this.launchCutInIdentifier);
    emitStopCutIn({ cutIn: cutIn_ });
  }

  stopSelfCutInByIdentifier(identifier: string) {
    const cutIn_ = ObjectStore.instance.get(identifier);
    emitStopCutIn({ cutIn: cutIn_ });
  }

  getCutIns(): CutIn[] {
    return ObjectStore.instance.getObjects(CutIn);
  }

  override apply(context: ObjectContext) {
    const launchCutInIdentifier = this.launchCutInIdentifier;
    const launchIsStart = this.launchIsStart;
    const launchTimeStamp = this.launchTimeStamp;
    const stopBlankTagCutInTimeStamp = this.stopBlankTagCutInTimeStamp;
    const soundOnlyTimeStamp = this.soundOnlyTimeStamp;
    super.apply(context);

    if (this.isInitialSync) {
      this.isInitialSync = false;
      return;
    }

    if (this.launchMySelf) {
      return;
    } // ソロ再生用の場合他の人は発火しない

    if (stopBlankTagCutInTimeStamp !== this.stopBlankTagCutInTimeStamp) {
      emitStopCutInByBgm();
    }

    if (this.sendTo != '') {
      // playing to one person
      if (this.sendTo != getPeerContext().userId) {
        return;
      }
    }

    if (
      launchCutInIdentifier !== this.launchCutInIdentifier ||
      launchIsStart !== this.launchIsStart ||
      launchTimeStamp !== this.launchTimeStamp
    ) {
      if (this.launchIsStart) {
        this.startSelfCutIn();
      } else {
        this.stopSelfCutIn();
      }
    }

    if (soundOnlyTimeStamp !== this.soundOnlyTimeStamp) {
      this.startSelfSoundOnly();
    }
  }
}
