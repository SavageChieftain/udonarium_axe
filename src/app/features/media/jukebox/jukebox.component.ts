import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { Playlist } from '@axe/domain/media/playlist';
import { Config } from '@axe/domain/peer/config';
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-jukebox',
  templateUrl: './jukebox.component.html',
  host: { class: 'block' },
  imports: [FormsModule, TranslocoModule],
})
export class JukeboxComponent {
  protected readonly isCompact = inject(ViewportService).isCompact;
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);

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

  get seVolume(): number {
    return this.jukebox?.seVolume ?? 0.5;
  }
  set seVolume(seVolume: number) {
    if (this.jukebox) this.jukebox.seVolume = seVolume;
    AudioPlayer.seVolume = seVolume * this.roomVolume;
  }

  readonly allTag = computed(() => this.t('feature.media.jukebox.tagAll'));

  readonly audios = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('audio-tag')();
    this.objectChange.versionOf('Jukebox')();
    const all = this.audioStorage.audios.filter((audio) => !audio.isHidden);
    const tag = this.selectTag();
    if (tag === this.allTag()) return all;
    return all.filter((audio) => {
      const audioTag = AudioTag.get(audio.identifier);
      const t = audioTag?.tag || 'BGM';
      return t === tag;
    });
  });

  readonly selectTag = signal(this.t('feature.media.jukebox.tagAll'));

  readonly viewMode = signal<'library' | 'playlist'>('library');

  readonly playlistAudios = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.versionOf('Playlist')();
    this.objectChange.versionOf('Jukebox')();
    const entries = this.playlist?.entries ?? [];
    return entries.map((id) => this.audioStorage.get(id)).filter((a): a is AudioFile => a !== null && !a.isHidden);
  });

  private dragFromIndex: number | null = null;

  readonly tagList = computed((): string[] => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('audio-tag')();
    const tags = new Set<string>(JukeboxComponent.PRESET_TAGS);
    for (const audio of this.audioStorage.audios) {
      if (audio.isHidden) continue;
      const audioTag = AudioTag.get(audio.identifier);
      const t = audioTag?.tag || 'BGM';
      tags.add(t);
    }
    const sorted = [...tags].sort();
    return [this.allTag(), ...sorted];
  });

  static readonly PRESET_TAGS = ['BGM', 'SE'];

  getTagOf(audio: AudioFile): string {
    return AudioTag.get(audio.identifier)?.tag || 'BGM';
  }

  setTagOf(audio: AudioFile, tag: string) {
    if (this.isInPlaylist(audio)) return;
    let audioTag = AudioTag.get(audio.identifier);
    if (!audioTag) audioTag = AudioTag.create(audio.identifier);
    audioTag.tag = tag;
    this.objectChange.notifyCollectionChanged('audio-tag');
  }

  isInPlaylist(audio: AudioFile): boolean {
    return this.playlist?.hasEntry(audio.identifier) ?? false;
  }

  addToPlaylist(audio: AudioFile): void {
    this.playlist?.addEntry(audio.identifier);
  }

  removeFromPlaylist(audio: AudioFile): void {
    this.playlist?.removeEntry(audio.identifier);
  }

  onPlaylistDragStart(index: number): void {
    this.dragFromIndex = index;
  }

  onPlaylistDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragFromIndex === null || this.dragFromIndex === index) return;
    this.playlist?.moveEntry(this.dragFromIndex, index);
    this.dragFromIndex = index;
  }

  onPlaylistDragEnd(): void {
    this.dragFromIndex = null;
  }
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox')!;
  }

  get playlist(): Playlist | null {
    return this.objectStore.get<Playlist>('Playlist') ?? null;
  }

  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher')!;
  }

  readonly auditionPlayer: AudioPlayer = new AudioPlayer();

  private readonly _tick = signal(0);

  readonly nowPlayingArtwork = computed(() => {
    this._tick();
    this.objectChange.versionOf('Jukebox')();
    return this.jukebox?.audio?.artworkUrl ?? null;
  });

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = this.t('feature.media.jukebox.title')));
    this.auditionPlayer.volumeType = VolumeType.AUDITION;
    this.destroyRef.onDestroy(() => this.stop());
    const timer = setInterval(() => this._tick.update((v) => v + 1), 500);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  play(audio: AudioFile) {
    this.auditionPlayer.play(audio);
  }

  stop() {
    this.auditionPlayer.stop();
  }

  playBGM(audio: AudioFile) {
    this.cutInLauncher.stopBlankTagCutIn();

    const isSE = this.getTagOf(audio) === 'SE';
    this.jukebox.play(audio.identifier, !isSE);
  }

  stopBGM(audio: AudioFile) {
    if (this.jukebox.audio === audio) this.jukebox.stop();
  }

  stopSE(audio: AudioFile) {
    this.jukebox.stopSE(audio.identifier);
  }

  isSePlaying(audio: AudioFile): boolean {
    return this.jukebox.isSePlaying(audio.identifier);
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!this.rolePermission.canEditTabletop) {
      input.value = '';
      return;
    }
    const files = input.files;
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  openCutInList() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x + 25, top: coordinate.y + 25, width: 980, height: 760 };
    this.panelService.open<CutInListComponent>(CutInListComponent, option);
  }
}
