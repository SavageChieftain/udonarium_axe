import { emitAlarmPop, emitAlarmTimeUp } from '@axe/core/event/domain-events';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { PresetSound } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@SyncObject('Alarm')
export class Alarm extends GameObject {
  @SyncVar() initTimeStamp = 0;
  @SyncVar() alarmTitle = '';
  @SyncVar() targetPeerId: string[] = [];
  @SyncVar() alarmTime = 0;
  @SyncVar() alarmId = 0;
  @SyncVar() alarmPeerId = '';
  @SyncVar() targetText = '';

  @SyncVar() isSound = false;
  @SyncVar() isPopUp = false;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  makeAlarm(
    alarmTime: number,
    alarmTitle: string,
    targetPeerId: string[],
    alarmPeerId: string,
    targetText: string,
    isSound: boolean,
    isPopUp: boolean
  ) {
    this.alarmTitle = alarmTitle;
    this.alarmTime = alarmTime;
    this.alarmId++;
    this.alarmPeerId = alarmPeerId;
    this.targetPeerId = targetPeerId;
    this.targetText = targetText;
    this.initTimeStamp = Date.now();
    this.isSound = isSound;
    this.isPopUp = isPopUp;
  }

  chkToMe(): boolean {
    if (!PeerCursor.myCursor) return false;
    for (const target of this.targetPeerId) {
      if (PeerCursor.myCursor.peerId == target) return true;
    }
    return false;
  }

  startAlarm() {
    if (this.chkToMe()) {
      setTimeout(() => {
        if (this.isSound) {
          const text_ = `アラーム(${this.alarmTime}秒)経過${this.targetText}${this.alarmTitle}`;
          emitAlarmTimeUp({ text: text_ });
          const audio = AudioStorage.instance.get(PresetSound.alarm);
          if (audio) AudioPlayer.play(audio, 0.5);
        }
        if (this.isPopUp) {
          emitAlarmPop({ title: this.alarmTitle, time: this.alarmTime });
        }
      }, this.alarmTime * 1000);
    }
  }

  override apply(context: ObjectContext) {
    const initTimeStamp = this.initTimeStamp;
    super.apply(context);

    if (initTimeStamp !== this.initTimeStamp) {
      this.startAlarm();
    }
  }
}
