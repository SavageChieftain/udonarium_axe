import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Jukebox } from '@axe/domain/media/jukebox';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cut-in-bgm',
  templateUrl: './cut-in-bgm.component.html',
})
export class CutInBgmComponent {
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly destroyRef = inject(DestroyRef);

  readonly audios = computed(() => {
    this.objectChange.fileVersion();
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  });
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox')!;
  }

  readonly auditionPlayer: AudioPlayer = new AudioPlayer();

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'カットインBGM選択'));
    this.auditionPlayer.volumeType = VolumeType.AUDITION;
    this.destroyRef.onDestroy(() => this.stop());
  }

  play(audio: AudioFile) {
    this.auditionPlayer.play(audio);
  }

  stop() {
    this.auditionPlayer.stop();
  }

  selectBgm(file: AudioFile) {
    if (!file) return;

    this.modalService.resolve(file.identifier);
  }

  handleFileSelect(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length) this.fileArchiver.load(files);
  }
}
