import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Config } from '@axe/class/config';
import { AudioFile } from '@axe/class/core/file-storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/class/core/file-storage/audio-player';
import { AudioStorage } from '@axe/class/core/file-storage/audio-storage';
import { FileArchiver } from '@axe/class/core/file-storage/file-archiver';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem } from '@axe/class/core/system';
import { CutInLauncher } from '@axe/class/cut-in-launcher';
import { Jukebox } from '@axe/class/Jukebox';
import { CutInListComponent } from '@axe/component/cut-in-list/cut-in-list.component';
import { ModalService } from '@axe/service/modal.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-jukebox',
  templateUrl: './jukebox.component.html',
  styleUrls: ['./jukebox.component.css'],
  imports: [FormsModule],
})
export class JukeboxComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private audioStorage = inject(AudioStorage);
  private fileArchiver = inject(FileArchiver);

  roomVolumeChange = false;

  get roomVolume(): number {
    const conf = this.objectStore.get<Config>('Config');
    return conf ? conf.roomVolume : 1;
  }

  set roomVolume(volume: number) {
    const conf = this.objectStore.get<Config>('Config');
    if (conf) conf.roomVolume = volume;
    this.jukebox.setNewVolume();
  }

  get volume(): number {
    return this.jukebox.volume;
  }
  set volume(volume: number) {
    this.jukebox.volume = volume;
    AudioPlayer.volume = volume * this.roomVolume;
  }

  get auditionVolume(): number {
    return this.jukebox.auditionVolume;
  }
  set auditionVolume(auditionVolume: number) {
    this.jukebox.auditionVolume = auditionVolume;
    AudioPlayer.auditionVolume = auditionVolume * this.roomVolume;
  }

  get audios(): AudioFile[] {
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  }
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox');
  }

  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher');
  }

  readonly auditionPlayer: AudioPlayer = new AudioPlayer();
  private lazyUpdateTimer: NodeJS.Timeout = null!;
  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ジュークボックス'));
    this.auditionPlayer.volumeType = VolumeType.AUDITION;
    EventSystem.register(this).on('*', (event) => {
      if (event.eventName.startsWith('FILE_')) this.lazyMarkForCheck();
    });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.stop();
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
    const input = <HTMLInputElement>event.target;
    const files = input.files;
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  private lazyMarkForCheck() {
    if (this.lazyUpdateTimer !== null) return;
    this.lazyUpdateTimer = setTimeout(() => {
      this.lazyUpdateTimer = null!;
      this.changeDetector.markForCheck();
    }, 100);
  }

  openCutInList() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x + 25, top: coordinate.y + 25, width: 650, height: 740 };
    this.panelService.open<CutInListComponent>(CutInListComponent, option);
  }
}
