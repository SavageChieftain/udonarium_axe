import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Jukebox } from '@axe/domain/media/Jukebox';
import { ModalService } from '@axe/shared/modal.service';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelService } from '@axe/shared/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cut-in-bgm',
  templateUrl: './cut-in-bgm.component.html',
  styleUrls: ['./cut-in-bgm.component.css'],
})
export class CutInBgmComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private objectChange = inject(ObjectChangeService);
  private panelService = inject(PanelService);
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
    this.objectChange.eventActivity$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.lazyMarkForCheck();
    });
  }

  ngOnDestroy() {
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

  private lazyMarkForCheck() {
    if (this.lazyUpdateTimer !== null) return;
    this.lazyUpdateTimer = setTimeout(() => {
      this.lazyUpdateTimer = null!;
      this.changeDetector.markForCheck();
    }, 100);
  }
}
