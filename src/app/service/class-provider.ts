import { Provider } from '@angular/core';
import { ChatTabList } from '@axe/chat-tab-list';
import { Config } from '@axe/config';
import { AudioSharingSystem } from '@axe/core/file-storage/audio-sharing-system';
import { AudioStorage } from '@axe/core/file-storage/audio-storage';
import { FileArchiver } from '@axe/core/file-storage/file-archiver';
import { ImageSharingSystem } from '@axe/core/file-storage/image-sharing-system';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { ObjectFactory } from '@axe/core/synchronize-object/object-factory';
import { ObjectSerializer } from '@axe/core/synchronize-object/object-serializer';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { ObjectSynchronizer } from '@axe/core/synchronize-object/object-synchronizer';
import { DataSummarySetting } from '@axe/data-summary-setting';
import { TableSelecter } from '@axe/table-selecter';

/**
 * src/app/class/ 配下のシングルトン群を Angular DI に登録するプロバイダ配列。
 *
 * 各シングルトンは従来通り static instance で自己管理されるが、
 * useFactory 経由で Angular の inject() でも取得できるようになる。
 *
 * Angular コンポーネント/サービスでは inject(ObjectStore) 等を使用し、
 * class/ 内のドメインモデルは従来通り ObjectStore.instance を使用する。
 */
export const CLASS_SINGLETON_PROVIDERS: Provider[] = [
  // Core synchronization
  { provide: ObjectFactory, useFactory: () => ObjectFactory.instance },
  { provide: ObjectSerializer, useFactory: () => ObjectSerializer.instance },
  { provide: ObjectStore, useFactory: () => ObjectStore.instance },
  { provide: ObjectSynchronizer, useFactory: () => ObjectSynchronizer.instance },

  // File & media storage
  { provide: FileArchiver, useFactory: () => FileArchiver.instance },
  { provide: ImageStorage, useFactory: () => ImageStorage.instance },
  { provide: ImageSharingSystem, useFactory: () => ImageSharingSystem.instance },
  { provide: AudioStorage, useFactory: () => AudioStorage.instance },
  { provide: AudioSharingSystem, useFactory: () => AudioSharingSystem.instance },

  // Game logic singletons (@SyncObject classes)
  { provide: ChatTabList, useFactory: () => ChatTabList.instance },
  { provide: Config, useFactory: () => Config.instance },
  { provide: DataSummarySetting, useFactory: () => DataSummarySetting.instance },
  { provide: TableSelecter, useFactory: () => TableSelecter.instance },
];
