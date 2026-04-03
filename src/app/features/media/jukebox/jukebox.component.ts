import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { Config } from '@axe/domain/peer/config';
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-jukebox',
  templateUrl: './jukebox.component.html',
  styleUrls: ['./jukebox.component.css'],
  imports: [FormsModule],
})
export class JukeboxComponent {
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly destroyRef = inject(DestroyRef);

  roomVolumeChange = false;

  get roomVolume(): number {
    const conf = this.objectStore.get<Config>('Config');
    return conf ? conf.roomVolume : 1;
  }

  set roomVolume(volume: number) {
    const conf = this.objectStore.get<Config>('Config');
    if (conf) conf.roomVolume = volume;
    this.jukebox?.setNewVolume();
  }

  get volume(): number {
    return this.jukebox?.volume ?? 0.5;
  }
  set volume(volume: number) {
    if (this.jukebox) this.jukebox.volume = volume;
    AudioPlayer.volume = volume * this.roomVolume;
  }

  get auditionVolume(): number {
    return this.jukebox?.auditionVolume ?? 0.5;
  }
  set auditionVolume(auditionVolume: number) {
    if (this.jukebox) this.jukebox.auditionVolume = auditionVolume;
    AudioPlayer.auditionVolume = auditionVolume * this.roomVolume;
  }

  get audios(): AudioFile[] {
    this.objectChange.fileVersion();
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  }
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox')!;
  }

  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher')!;
  }

  readonly auditionPlayer: AudioPlayer = new AudioPlayer();

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ジュークボックス'));
    this.auditionPlayer.volumeType = VolumeType.AUDITION;
    this.destroyRef.onDestroy(() => this.stop());
  }

  play(audio: AudioFile) {
    this.auditionPlayer.play(audio);
  }

  stop() {
    this.auditionPlayer.stop();
  }

  playBGM(audio: AudioFile) {
    //memoこっちが全体

    //タグなしのBGM付きカットインはジュークボックスと同時に鳴らさないようにする
    //BGM駆動のためのインスタンスを別にしているため現状この処理で止める
    this.cutInLauncher.stopBlankTagCutIn();

    this.jukebox.play(audio.identifier, true);
  }

  stopBGM(audio: AudioFile) {
    if (this.jukebox.audio === audio) this.jukebox.stop();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  openCutInList() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x + 25, top: coordinate.y + 25, width: 650, height: 740 };
    this.panelService.open<CutInListComponent>(CutInListComponent, option);
  }
}
