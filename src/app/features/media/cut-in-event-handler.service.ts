import { DestroyRef, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';

/**
 * カットイン（startCutIn$ / soundOnlyCutIn$）のドメインイベントを購読し、
 * - 通常カットイン: パネルを開いて再生
 * - 音のみカットイン: 動画 ID があれば不可視パネルで音再生、なければ生 AudioPlayer
 * を制御するサービス。`providedIn: 'root'` で自己購読する。
 */
@Injectable({ providedIn: 'root' })
export class CutInEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly audioStorage = inject(AudioStorage);
  private readonly panelService = inject(PanelService);

  private readonly soundOnlyPlayer = new AudioPlayer();

  constructor() {
    this.objectChange.startCutIn$.subscribe((event) => {
      this.openCutInPanel(event.cutIn as CutIn);
    }, this.destroyRef);
    this.objectChange.soundOnlyCutIn$.subscribe((event) => {
      const cutIn = event.cutIn as CutIn;
      if (!cutIn) return;
      if (cutIn.videoId) {
        this.openCutInPanel(cutIn, true);
      } else {
        const audio = this.audioStorage.get(cutIn.audioIdentifier);
        if (audio) {
          this.soundOnlyPlayer.loop = false;
          this.soundOnlyPlayer.play(audio);
        }
      }
    }, this.destroyRef);
  }

  private openCutInPanel(cutIn: CutIn, invisible = false): void {
    if (!cutIn) return;
    const marginW = Math.max(0, window.innerWidth - cutIn.width);
    const marginH = Math.max(0, window.innerHeight - cutIn.height - 25);

    const option: PanelOption = {
      title: 'カットイン : ' + cutIn.name,
      width: cutIn.width,
      height: cutIn.height + 25,
      left: (marginW * cutIn.x_pos) / 100,
      top: (marginH * cutIn.y_pos) / 100,
      isCutIn: true,
      cutInIdentifier: cutIn.identifier,
      invisible,
    };

    const component = this.panelService.open(CutInWindowComponent, option);
    component.cutIn = cutIn;
    component.forceNoLoop = invisible;
    component.startCutIn();
  }
}
