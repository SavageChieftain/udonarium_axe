import { Network } from '@axe/core/index';
import { Logger } from '@axe/core/logging/logger';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import * as FileReaderUtil from '@axe/core/storage/file-reader-util';
import { ImageStorage } from '@axe/core/storage/image-storage';
import * as MimeType from '@axe/core/storage/mime-type';
import { ObjectStore } from '@axe/core/sync/object-store';
import { xml2element } from '@axe/core/util/xml-util';
import { emitFileLoaded, emitXmlLoaded } from '@axe/domain/domain-events';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { type AsyncZippable, unzip, type Unzipped, zip } from 'fflate';

type MetaData = { percent: number; currentFile: string };
type UpdateCallback = (metadata: MetaData) => void;

const MEGA_BYTE = 1024 * 1024;

export class FileArchiver {
  private static _instance: FileArchiver;
  static get instance(): FileArchiver {
    if (!FileArchiver._instance) FileArchiver._instance = new FileArchiver();
    return FileArchiver._instance;
  }

  networkService = Network;
  get reloadCheck(): ReloadCheck {
    return ObjectStore.instance.get<ReloadCheck>('ReloadCheck')!;
  }

  private maxImageSize = 2 * MEGA_BYTE;
  private maxAudioSize = 10 * MEGA_BYTE;

  private callbackOnDragEnter: ((this: HTMLElement, e: DragEvent) => void) | null = null;
  private callbackOnDragOver: ((this: HTMLElement, e: DragEvent) => void) | null = null;
  private callbackOnDrop: ((this: HTMLElement, e: DragEvent) => void) | null = null;

  private constructor() {}

  initialize() {
    this.destroy();
    this.addEventListeners();
  }

  private destroy() {
    this.removeEventListeners();
  }

  private addEventListeners() {
    this.removeEventListeners();
    this.callbackOnDragEnter = (e) => this.onDragEnter(e);
    this.callbackOnDragOver = (e) => this.onDragOver(e);
    this.callbackOnDrop = (e) => this.onDrop(e);
    document.body.addEventListener('dragenter', this.callbackOnDragEnter as EventListener, false);
    document.body.addEventListener('dragover', this.callbackOnDragOver as EventListener, false);
    document.body.addEventListener('drop', this.callbackOnDrop as EventListener, false);
  }

  private removeEventListeners() {
    if (this.callbackOnDragEnter)
      document.body.removeEventListener('dragenter', this.callbackOnDragEnter as EventListener, false);
    if (this.callbackOnDragOver)
      document.body.removeEventListener('dragover', this.callbackOnDragOver as EventListener, false);
    if (this.callbackOnDrop) document.body.removeEventListener('drop', this.callbackOnDrop as EventListener, false);
    this.callbackOnDragEnter = null;
    this.callbackOnDragOver = null;
    this.callbackOnDrop = null;
  }

  private onDragEnter(event: DragEvent) {
    event.preventDefault();
  }

  private onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private onDrop(event: DragEvent) {
    event.preventDefault();

    this.reloadCheck.reloadCheckStart(this.networkService.peerContext.roomName !== '');

    const files = event.dataTransfer?.files;
    if (!files) return;
    this.load(files, { x: event.clientX, y: event.clientY });
  }

  async load(files: File[] | FileList, dropPoint?: { x: number; y: number }): Promise<void> {
    if (!files) return;
    const loadFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    for (const file of loadFiles) {
      await this.handleImage(file);
      await this.handleAudio(file);
      await this.handleText(file, dropPoint);
      await this.handleZip(file, dropPoint);
      emitFileLoaded();
    }
  }

  private async handleImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (!this.reloadCheck.isLoadOk()) return;
    if (file.size > this.maxImageSize) {
      Logger.warn(`[FileArchiver] ファイルサイズ制限超過: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    await ImageStorage.instance.addAsync(file);
  }

  private async handleAudio(file: File) {
    if (!file.type.startsWith('audio/')) return;
    if (file.size > this.maxAudioSize) {
      Logger.warn(`[FileArchiver] ファイルサイズ制限超過: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    await AudioStorage.instance.addAsync(file);
  }

  private async handleText(file: File, dropPoint?: { x: number; y: number }): Promise<void> {
    if (!file.type.startsWith('text/')) return;

    let isLoadOk = true;
    // data.xmlはここでは通過させ後段で中身が部屋データ更新だった場合更新確認をする
    if (
      file.name === 'config.xml' ||
      file.name === 'imagetag.xml' ||
      file.name === 'audiotag.xml' ||
      file.name === 'summary.xml'
    ) {
      isLoadOk = this.reloadCheck.isLoadOk();
    }

    if (isLoadOk) {
      try {
        const xmlElement: Element | null = xml2element(await FileReaderUtil.readAsTextAsync(file));
        if (xmlElement) emitXmlLoaded({ xmlElement, dropPoint });
      } catch (reason) {
        Logger.warn('[FileArchiver] XML読み込みエラー', reason);
      }
    }
  }

  private async handleZip(file: File, dropPoint?: { x: number; y: number }) {
    if (!file.type.includes('application/') && file.type.length > 0) return;
    let entries: Unzipped;
    try {
      const arrayBuffer = await file.arrayBuffer();
      entries = await new Promise<Unzipped>((resolve, reject) => {
        unzip(new Uint8Array(arrayBuffer), (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    } catch (reason) {
      Logger.warn('[FileArchiver] ZIP読み込みエラー', reason);
      return;
    }
    for (const [name, data] of Object.entries(entries)) {
      try {
        await this.load([new File([data.slice()], name, { type: MimeType.type(name) })], dropPoint);
      } catch (reason) {
        Logger.warn('[FileArchiver] ZIP展開エラー', reason);
      }
    }
  }

  async saveAsync(files: File[] | FileList, zipName: string, updateCallback?: UpdateCallback): Promise<void> {
    if (!files) return;
    const saveFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    updateCallback?.({ percent: 0, currentFile: '' });

    const zipData: AsyncZippable = {};
    for (const file of saveFiles) {
      zipData[file.name] = [new Uint8Array(await file.arrayBuffer()), { level: 6 }];
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      zip(zipData, (err, data) => {
        if (err) reject(err);
        else resolve(new Blob([data.slice()], { type: 'application/zip' }));
      });
    });

    updateCallback?.({ percent: 100, currentFile: '' });
    downloadBlob(blob, `${zipName}.zip`);
  }
}

function toArrayOfFileList(fileList: FileList): File[] {
  return Array.from(fileList);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
