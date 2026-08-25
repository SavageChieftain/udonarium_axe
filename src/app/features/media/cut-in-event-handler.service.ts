import { DestroyRef, inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutIn, cutInPanelChrome } from '@axe/domain/media/cut-in';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';

@Injectable({ providedIn: 'root' })
export class CutInEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly audioStorage = inject(AudioStorage);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);

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
          const isSE = AudioTag.get(cutIn.audioIdentifier)?.tag === 'SE';
          this.soundOnlyPlayer.volumeType = isSE ? VolumeType.SE : VolumeType.MASTER;
          this.soundOnlyPlayer.loop = false;
          this.soundOnlyPlayer.play(audio);
        }
      }
    }, this.destroyRef);
  }

  private openCutInPanel(cutIn: CutIn, invisible = false): void {
    if (!cutIn) return;
    const chrome = cutInPanelChrome(cutIn);
    const marginW = Math.max(0, window.innerWidth - cutIn.width);
    const marginH = Math.max(0, window.innerHeight - cutIn.height - chrome);

    const option: PanelOption = {
      title: this.t('feature.media.cutIn.panelTitleWith', { name: cutIn.name }),
      width: cutIn.width,
      height: cutIn.height + chrome,
      left: (marginW * cutIn.x_pos) / 100,
      top: (marginH * cutIn.y_pos) / 100,
      isCutIn: true,
      cutInIdentifier: cutIn.identifier,
      invisible,
      frameless: cutIn.frameless,
    };

    const component = this.panelService.open(CutInWindowComponent, option);
    component.cutIn = cutIn;
    component.forceNoLoop = invisible;
    component.startCutIn();
  }
}
