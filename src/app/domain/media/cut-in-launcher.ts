import { Network } from '@axe/core/index';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { emitStartCutIn, emitStopCutIn, emitStopCutInByBgm } from '@axe/domain/domain-events';
import { CutIn } from '@axe/domain/media/cut-in';
import { Jukebox } from '@axe/domain/media/Jukebox';

@SyncObject('cut-in-launcher')
export class CutInLauncher extends GameObject {
  @SyncVar() launchCutInIdentifier: string = '';
  @SyncVar() launchTimeStamp: number = 0;
  @SyncVar() launchMySelf = false;
  @SyncVar() launchIsStart: boolean = false;
  @SyncVar() stopBlankTagCutInTimeStamp: number = 0;
  @SyncVar() sendTo: string = '';

  reloadDummy = 5;

  get jukebox(): Jukebox {
    return ObjectStore.instance.get<Jukebox>('Jukebox');
  }

  isCutInBgmUploaded(audioIdentifier: string) {
    const audio = AudioStorage.instance.get(audioIdentifier);
    return audio !== null;
  }

  chatActivateCutIn(text: string, sendTo: string) {
    const text2 = ` ${text}`;
    const matches_array = text2.match(/\s(\S+)$/i);
    let activateName: string;

    if (matches_array) {
      activateName = RegExp.$1;
      const allCutIn = this.getCutIns();

      for (const cutIn_ of allCutIn) {
        if (cutIn_.chatActivate && cutIn_.name == activateName) {
          // 無タグで音声付きの場合BGM停止
          if (this.isCutInBgmUploaded(cutIn_.audioIdentifier) && cutIn_.tagName == '') {
            this.jukebox.stop();
          }

          this.startCutIn(cutIn_, sendTo);
          return;
        }
      }
    }
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

  // override
  apply(context: ObjectContext) {
    const launchCutInIdentifier = this.launchCutInIdentifier;
    const launchIsStart = this.launchIsStart;
    const launchTimeStamp = this.launchTimeStamp;
    const stopBlankTagCutInTimeStamp = this.stopBlankTagCutInTimeStamp;
    super.apply(context);

    if (this.launchMySelf) {
      return;
    } // ソロ再生用の場合他の人は発火しない

    if (stopBlankTagCutInTimeStamp !== this.stopBlankTagCutInTimeStamp) {
      emitStopCutInByBgm();
    }

    if (this.sendTo != '') {
      // 秘話再生
      if (this.sendTo != Network.peerContext.userId) {
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
  }
}
