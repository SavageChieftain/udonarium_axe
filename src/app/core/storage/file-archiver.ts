import { emitCcfoliaRoomDropped, emitFileLoaded, emitImageDropped, emitXmlLoaded } from '@axe/core/event/domain-events';
import { Network } from '@axe/core/index';
import { Logger } from '@axe/core/logging/logger';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import * as FileReaderUtil from '@axe/core/storage/file-reader-util';
import { ImageStorage } from '@axe/core/storage/image-storage';
import * as MimeType from '@axe/core/storage/mime-type';
import { isCcfoliaRoomArchive } from '@axe/core/storage/room-archive';
import { createZipBlob } from '@axe/core/storage/zip-archive';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { downloadBlob } from '@axe/core/util/download-blob';
import { xml2element } from '@axe/core/util/xml-util';
import { unzip, type Unzipped } from 'fflate';

type MetaData = { percent: number; currentFile: string };
type UpdateCallback = (metadata: MetaData) => void;

/** ReloadCheck（domain）の構造的契約。core は domain を直接知らないため、
 *  ObjectStore 経由でこの shape を満たすシングルトン（alias `'ReloadCheck'`）に依存する。 */
interface LoadGuard extends GameObject {
  reloadCheckStart(isOnline: boolean): void;
  isLoadOk(): boolean;
}

const MEGA_BYTE = 1024 * 1024;
const DROP_STACK_OFFSET = 20;
const XML_MIME_TYPE = 'text/xml';

export function isXmlCandidateFile(file: File): boolean {
  if (!file.type.startsWith('text/')) return false;
  if (file.type !== 'text/plain' && file.type !== XML_MIME_TYPE) return false;

  const typeByName = MimeType.type(file.name);
  return typeByName === '' || typeByName === XML_MIME_TYPE;
}

export class FileArchiver {
  private static _instance: FileArchiver;
  static get instance(): FileArchiver {
    if (!FileArchiver._instance) FileArchiver._instance = new FileArchiver();
    return FileArchiver._instance;
  }

  networkService = Network;
  get reloadCheck(): LoadGuard {
    return ObjectStore.instance.get<LoadGuard>('ReloadCheck')!;
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
    await this.loadFiles(files, dropPoint, true);
  }

  private async loadFiles(
    files: File[] | FileList,
    dropPoint: { x: number; y: number } | undefined,
    placesDroppedImages: boolean
  ): Promise<void> {
    if (!files) return;
    const loadFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    let droppedImageCount = 0;
    for (const file of loadFiles) {
      const imageDropPoint = placesDroppedImages ? this.offsetDropPoint(dropPoint, droppedImageCount) : undefined;
      const isImageDropped = await this.handleImage(file, imageDropPoint);
      if (isImageDropped) droppedImageCount++;
      await this.handleAudio(file);
      await this.handleText(file, dropPoint);
      await this.handleZip(file, dropPoint);
      emitFileLoaded();
    }
  }

  private offsetDropPoint(
    dropPoint: { x: number; y: number } | undefined,
    index: number
  ): { x: number; y: number } | undefined {
    if (!dropPoint) return undefined;
    const offset = index * DROP_STACK_OFFSET;
    return { x: dropPoint.x + offset, y: dropPoint.y + offset };
  }

  private async handleImage(file: File, dropPoint?: { x: number; y: number }): Promise<boolean> {
    if (!file.type.startsWith('image/')) return false;
    if (!this.reloadCheck.isLoadOk()) return false;
    if (file.size > this.maxImageSize) {
      Logger.warn(`[FileArchiver] ファイルサイズ制限超過: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return false;
    }
    const image = await ImageStorage.instance.addAsync(file);
    if (dropPoint) emitImageDropped({ identifier: image.identifier, fileName: file.name, dropPoint });
    return dropPoint != null;
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
    if (!isXmlCandidateFile(file)) return;

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
    if (isCcfoliaRoomArchive(Object.keys(entries))) {
      emitCcfoliaRoomDropped({ entries });
      return;
    }

    for (const [name, data] of Object.entries(entries)) {
      try {
        await this.loadFiles([new File([data.slice()], name, { type: MimeType.type(name) })], dropPoint, false);
      } catch (reason) {
        Logger.warn('[FileArchiver] ZIP展開エラー', reason);
      }
    }
  }

  async createZipBlobAsync(files: File[] | FileList, updateCallback?: UpdateCallback): Promise<Blob> {
    const saveFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    updateCallback?.({ percent: 0, currentFile: '' });

    const blob = await createZipBlob(saveFiles);

    updateCallback?.({ percent: 100, currentFile: '' });
    return blob;
  }

  async saveAsync(files: File[] | FileList, zipName: string, updateCallback?: UpdateCallback): Promise<void> {
    if (!files) return;
    const blob = await this.createZipBlobAsync(files, updateCallback);
    downloadBlob(blob, `${zipName}.zip`);
  }
}

function toArrayOfFileList(fileList: FileList): File[] {
  return Array.from(fileList);
}
