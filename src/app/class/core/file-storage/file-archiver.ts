import { Logger } from '@axe/core/logger';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';
import { xml2element } from '@axe/core/system/util/xml-util';
import { ReloadCheck } from '@axe/reload-check';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import { AudioStorage } from './audio-storage';
import * as FileReaderUtil from './file-reader-util';
import { ImageStorage } from './image-storage';
import * as MimeType from './mime-type';

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
    return ObjectStore.instance.get<ReloadCheck>('ReloadCheck');
  }

  private maxImageSize = 2 * MEGA_BYTE;
  private maxAudioeSize = 10 * MEGA_BYTE;

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
    document.body.addEventListener('dragenter', this.callbackOnDragEnter! as EventListener, false);
    document.body.addEventListener('dragover', this.callbackOnDragOver! as EventListener, false);
    document.body.addEventListener('drop', this.callbackOnDrop! as EventListener, false);
  }

  private removeEventListeners() {
    document.body.removeEventListener('dragenter', this.callbackOnDragEnter! as EventListener, false);
    document.body.removeEventListener('dragover', this.callbackOnDragOver! as EventListener, false);
    document.body.removeEventListener('drop', this.callbackOnDrop! as EventListener, false);
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

    this.reloadCheck.reloadCheckStart(this.networkService.peerContext.roomName != '');

    const files = event.dataTransfer!.files;
    this.load(files);
  }

  async load(files: File[]): Promise<void>;
  async load(files: FileList): Promise<void>;
  async load(files: File[] | FileList): Promise<void> {
    if (!files) return;
    const loadFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    for (const file of loadFiles) {
      await this.handleImage(file);
      await this.handleAudio(file);
      await this.handleText(file);
      await this.handleZip(file);
      EventSystem.trigger('FILE_LOADED', { file: file });
    }
  }

  private async handleImage(file: File) {
    if (file.type.indexOf('image/') < 0) return;
    if (!this.reloadCheck.isLoadOk()) return;
    if (this.maxImageSize < file.size) {
      Logger.warn(`[FileArchiver] ファイルサイズ制限超過: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    await ImageStorage.instance.addAsync(file);
  }

  private async handleAudio(file: File) {
    if (file.type.indexOf('audio/') < 0) return;
    if (this.maxAudioeSize < file.size) {
      Logger.warn(`[FileArchiver] ファイルサイズ制限超過: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    await AudioStorage.instance.addAsync(file);
  }

  private async handleText(file: File): Promise<void> {
    if (file.type.indexOf('text/') < 0) return;

    let isLoadOk = true;
    // data.xmlはここでは通過させ後段で中身が部屋データ更新だった場合更新確認をする
    if (file.name == 'config.xml' || file.name == 'imagetag.xml' || file.name == 'summary.xml') {
      isLoadOk = this.reloadCheck.isLoadOk();
    }

    if (isLoadOk) {
      try {
        const xmlElement: Element = xml2element(await FileReaderUtil.readAsTextAsync(file));
        if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
      } catch (reason) {
        Logger.warn('[FileArchiver] XML読み込みエラー', reason);
      }
    }
  }

  private async handleZip(file: File) {
    if (!(0 <= file.type.indexOf('application/') || file.type.length < 1)) return;
    let zip = new JSZip();
    try {
      zip = await zip.loadAsync(file);
    } catch (reason) {
      Logger.warn('[FileArchiver] ZIP読み込みエラー', reason);
      return;
    }
    const zipEntries: JSZip.JSZipObject[] = [];
    zip.forEach((relativePath, zipEntry) => zipEntries.push(zipEntry));
    for (const zipEntry of zipEntries) {
      try {
        const arraybuffer = await zipEntry.async('arraybuffer');
        await this.load([
          new File([arraybuffer], zipEntry.name, {
            type: MimeType.type(zipEntry.name),
          }),
        ]);
      } catch (reason) {
        Logger.warn('[FileArchiver] ZIP展開エラー', reason);
      }
    }
  }

  async saveAsync(files: File[], zipName: string, updateCallback?: UpdateCallback): Promise<void>;
  async saveAsync(files: FileList, zipName: string, updateCallback?: UpdateCallback): Promise<void>;
  async saveAsync(files: File[] | FileList, zipName: string, updateCallback?: UpdateCallback): Promise<void> {
    if (!files) return;
    const saveFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    const zip = new JSZip();
    for (const file of saveFiles) {
      zip.file(file.name, file);
    }

    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
      },
      updateCallback
    );
    saveAs(blob, `${zipName}.zip`);
  }
}

function toArrayOfFileList(fileList: FileList): File[] {
  const files: File[] = [];
  const length = fileList.length;
  for (let i = 0; i < length; i++) {
    files.push(fileList[i]);
  }
  return files;
}
