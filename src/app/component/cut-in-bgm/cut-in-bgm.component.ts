import { Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { AudioFile } from '@axe/core/file-storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/file-storage/audio-player';
import { AudioStorage } from '@axe/core/file-storage/audio-storage';
import { FileArchiver } from '@axe/core/file-storage/file-archiver';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { Jukebox } from '@axe/Jukebox';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

@Component({
  selector: 'app-cut-in-bgm',
  templateUrl: './cut-in-bgm.component.html',
  styleUrls: ['./cut-in-bgm.component.css'],
})
export class CutInBgmComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private ngZone = inject(NgZone);
  private objectStore = inject(ObjectStore);
  private audioStorage = inject(AudioStorage);
  private fileArchiver = inject(FileArchiver);

  get audios(): AudioFile[] {
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  }
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox');
  }

  readonly auditionPlayer: AudioPlayer = new AudioPlayer();
  private lazyUpdateTimer: NodeJS.Timeout = null!;
  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'カットインBGM選択'));
    this.auditionPlayer.volumeType = VolumeType.AUDITION;
    EventSystem.register(this).on('*', (_event) => {});
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.lazyUpdateTimer) {
      clearTimeout(this.lazyUpdateTimer);
      this.lazyUpdateTimer = null!;
    }
    this.stop();
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
    const files = (<HTMLInputElement>event.target).files;
    if (files && files.length) this.fileArchiver.load(files);
  }

  private lazyNgZoneUpdate() {
    if (this.lazyUpdateTimer !== null) return;
    this.lazyUpdateTimer = setTimeout(() => {
      this.lazyUpdateTimer = null!;
      this.ngZone.run(() => {});
    }, 100);
  }
}
