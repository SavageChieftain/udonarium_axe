import { Provider } from '@angular/core';
import { AudioSharingSystem } from '@axe/core/storage/audio-sharing-system';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageSharingSystem } from '@axe/core/storage/image-sharing-system';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
import { Config } from '@axe/domain/peer/config';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { TurnState } from '@axe/domain/tabletop/turn-state';

export const CLASS_SINGLETON_PROVIDERS: Provider[] = [
  { provide: ObjectFactory, useFactory: () => ObjectFactory.instance },
  { provide: ObjectSerializer, useFactory: () => ObjectSerializer.instance },
  { provide: ObjectStore, useFactory: () => ObjectStore.instance },
  { provide: ObjectSynchronizer, useFactory: () => ObjectSynchronizer.instance },

  { provide: FileArchiver, useFactory: () => FileArchiver.instance },
  { provide: ImageStorage, useFactory: () => ImageStorage.instance },
  { provide: ImageSharingSystem, useFactory: () => ImageSharingSystem.instance },
  { provide: AudioStorage, useFactory: () => AudioStorage.instance },
  { provide: AudioSharingSystem, useFactory: () => AudioSharingSystem.instance },

  { provide: ChatTabList, useFactory: () => ChatTabList.instance },
  { provide: Config, useFactory: () => Config.instance },
  { provide: DataSummarySetting, useFactory: () => DataSummarySetting.instance },
  { provide: TableSelecter, useFactory: () => TableSelecter.instance },
  { provide: TurnState, useFactory: () => TurnState.instance },
];
