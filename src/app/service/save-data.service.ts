import { inject, Injectable } from '@angular/core';
import { ChatTab } from '@axe/class/chat-tab';
import { ChatTabList } from '@axe/class/chat-tab-list';
import { Config } from '@axe/class/config';
import { FileArchiver } from '@axe/class/core/file-storage/file-archiver';
import { ImageFile, ImageState } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import * as MimeType from '@axe/class/core/file-storage/mime-type';
import { GameObject } from '@axe/class/core/synchronize-object/game-object';
import { PromiseQueue } from '@axe/class/core/system/util/promise-queue';
import { xml2element } from '@axe/class/core/system/util/xml-util';
import { DataSummarySetting } from '@axe/class/data-summary-setting';
import { ImageTagList } from '@axe/class/image-tag-list';
import { Room } from '@axe/class/room';
import { saveAs } from 'file-saver';
import xmlFormat from 'xml-formatter';
type UpdateCallback = (percent: number) => void;

@Injectable({
  providedIn: 'root',
})
export class SaveDataService {
  private imageStorage = inject(ImageStorage);
  private fileArchiver = inject(FileArchiver);
  private chatTabList = inject(ChatTabList);
  private appConfig = inject(Config);
  private dataSummarySetting = inject(DataSummarySetting);

  private static queue: PromiseQueue = new PromiseQueue('SaveDataServiceQueue');

  saveRoomAsync(fileName: string = 'ルームデータ', updateCallback?: UpdateCallback): Promise<void> {
    return SaveDataService.queue.add(() => this._saveRoomAsync(fileName, updateCallback));
  }

  private _saveRoomAsync(fileName: string = 'ルームデータ', updateCallback?: UpdateCallback): Promise<void> {
    const files: File[] = [];
    const roomXml = this.convertToXml(new Room());
    const chatXml = this.convertToXml(this.chatTabList);
    const configXml = this.convertToXml(this.appConfig);
    const summarySetting = this.convertToXml(this.dataSummarySetting);
    files.push(new File([roomXml], 'data.xml', { type: 'text/plain' }));
    files.push(new File([chatXml], 'chat.xml', { type: 'text/plain' }));
    files.push(new File([configXml], 'config.xml', { type: 'text/plain' }));
    files.push(new File([summarySetting], 'summary.xml', { type: 'text/plain' }));

    let images: ImageFile[] = [];
    images = images.concat(this.searchImageFiles(roomXml));
    images = images.concat(this.searchImageFiles(chatXml));
    for (const image of images) {
      if (image.state === ImageState.COMPLETE) {
        files.push(
          new File([image.blob!], image.identifier + '.' + MimeType.extension(image.blob!.type), {
            type: image.blob!.type,
          })
        );
      }
    }

    const imageTagXml = this.convertToXml(ImageTagList.create(images));
    files.push(new File([imageTagXml], 'imagetag.xml', { type: 'text/plain' }));

    return this.saveAsync(files, this.appendTimestamp(fileName), updateCallback);
  }

  saveGameObjectAsync(
    gameObject: GameObject,
    fileName: string = 'xml_data',
    updateCallback?: UpdateCallback
  ): Promise<void> {
    return SaveDataService.queue.add(() => this._saveGameObjectAsync(gameObject, fileName, updateCallback));
  }

  private _saveGameObjectAsync(
    gameObject: GameObject,
    fileName: string = 'xml_data',
    updateCallback?: UpdateCallback
  ): Promise<void> {
    const files: File[] = [];
    const xml: string = this.convertToXml(gameObject);

    files.push(new File([xml], 'data.xml', { type: 'text/plain' }));
    let images: ImageFile[] = [];
    images = images.concat(this.searchImageFiles(xml));
    for (const image of images) {
      if (image.state === ImageState.COMPLETE) {
        files.push(
          new File([image.blob!], image.identifier + '.' + MimeType.extension(image.blob!.type), {
            type: image.blob!.type,
          })
        );
      }
    }

    const imageTagXml = this.convertToXml(ImageTagList.create(images));
    files.push(new File([imageTagXml], 'imagetag.xml', { type: 'text/plain' }));

    return this.saveAsync(files, this.appendTimestamp(fileName), updateCallback);
  }

  private saveAsync(files: File[], zipName: string, updateCallback?: UpdateCallback): Promise<void> {
    let progresPercent = -1;
    return this.fileArchiver.saveAsync(files, zipName, (meta) => {
      const percent = meta.percent | 0;
      if (percent <= progresPercent) return;
      progresPercent = percent;
      updateCallback?.(progresPercent);
    });
  }

  private convertToXml(gameObject: GameObject): string {
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
    return xmlFormat(xmlDeclaration + gameObject.toXml(), {
      indentation: '  ',
      collapseContent: true,
      lineSeparator: '\n',
    });
  }
  private searchImageFiles(xml: string): ImageFile[] {
    const xmlElement: Element = xml2element(xml);

    const files: ImageFile[] = [];
    if (!xmlElement) return files;

    const images: { [identifier: string]: ImageFile } = {};
    let imageElements = xmlElement.ownerDocument.querySelectorAll('*[type="image"]');

    for (let i = 0; i < imageElements.length; i++) {
      const identifier = imageElements[i].innerHTML;
      images[identifier] = this.imageStorage.get(identifier);
    }

    imageElements = xmlElement.ownerDocument.querySelectorAll('*[imageIdentifier], *[backgroundImageIdentifier]');

    for (let i = 0; i < imageElements.length; i++) {
      const identifier = imageElements[i].getAttribute('imageIdentifier');
      if (identifier) images[identifier] = this.imageStorage.get(identifier);
      const backgroundImageIdentifier = imageElements[i].getAttribute('backgroundImageIdentifier');
      if (backgroundImageIdentifier)
        images[backgroundImageIdentifier] = this.imageStorage.get(backgroundImageIdentifier);
    }
    for (const identifier in images) {
      const image = images[identifier];
      if (image) {
        files.push(image);
      }
    }
    return files;
  }

  saveHtmlChatLog(chatTab: ChatTab, fileName: string) {
    const text: string = chatTab.logHtml();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName + '.html');
  }

  saveHtmlChatLogAll(fileName: string) {
    const text: string = this.chatTabList.logHtml();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName + '.html');
  }

  saveHtmlChatLogCoc(chatTab: ChatTab, fileName: string) {
    const text: string = chatTab.logHtmlCoc();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName + '.html');
  }

  saveHtmlChatLogAllCoc(fileName: string) {
    const text: string = this.chatTabList.logHtmlCoc();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName + '.html');
  }

  private appendTimestamp(fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('00' + (date.getMonth() + 1)).slice(-2);
    const day = ('00' + date.getDate()).slice(-2);
    const hours = ('00' + date.getHours()).slice(-2);
    const minutes = ('00' + date.getMinutes()).slice(-2);

    return fileName + `_${year}-${month}-${day}_${hours}${minutes}`;
  }
}
