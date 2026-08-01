import { inject, Injectable } from '@angular/core';
import { KeyboardInsetService } from '@axe/application/ui/keyboard-inset.service';
import { AppConfigService } from '@axe/composition/app-config.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { initializeNetworkMessaging } from '@axe/core/network/network-messaging';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioSharingSystem } from '@axe/core/storage/audio-sharing-system';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { loadIdentity } from '@axe/core/storage/identity-storage';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageSharingSystem } from '@axe/core/storage/image-sharing-system';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { Alarm } from '@axe/domain/alarm/alarm';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
import { MarkDown } from '@axe/domain/data/mark-down';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { Playlist } from '@axe/domain/media/playlist';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { Config } from '@axe/domain/peer/config';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { normalizePeerRole } from '@axe/domain/peer/peer-role';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { TurnState } from '@axe/domain/tabletop/turn-state';
import { Vote } from '@axe/domain/vote/vote';
import { NgSelectConfig } from '@ng-select/ng-select';

@Injectable({ providedIn: 'root' })
export class AppInitializationService {
  private readonly fileArchiver = inject(FileArchiver);
  private readonly appConfigService = inject(AppConfigService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly audioStorage = inject(AudioStorage);
  private readonly chatTabList = inject(ChatTabList);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly turnState = inject(TurnState);
  private readonly config = inject(Config);
  private readonly dataSummarySetting = inject(DataSummarySetting);
  private readonly ngSelectConfig = inject(NgSelectConfig);
  private readonly keyboardInset = inject(KeyboardInsetService);

  initialize(): void {
    initializeNetworkMessaging();
    this.fileArchiver.initialize();
    ImageSharingSystem.instance.initialize();
    AudioSharingSystem.instance.initialize();
    ObjectSynchronizer.instance.initialize();
    this.appConfigService.initialize();
    this.pointerDeviceService.initialize();
    this.keyboardInset.initialize();
    this.ngSelectConfig.appendTo = 'body';

    this.tableSelecter.initialize();
    this.turnState.initialize();
    this.chatTabList.initialize();
    this.config.initialize();
    this.dataSummarySetting.initialize();

    this.initializeDomainObjects();
    this.initializeChatTabs();
    this.initializeAudioPresets();
    this.initializePeerCursor();
  }

  private initializeDomainObjects(): void {
    const diceBot = new DiceBot('DiceBot');
    diceBot.initialize();
    DiceBot.getHelpMessage('');

    const jukebox = new Jukebox('Jukebox');
    jukebox.initialize();

    const playlist = new Playlist('Playlist');
    playlist.initialize();

    const markdown = new MarkDown('markdown');
    markdown.initialize();

    const cutInLauncher = new CutInLauncher('CutInLauncher');
    cutInLauncher.initialize();

    const vote = new Vote('Vote');
    vote.initialize();

    const alarm = new Alarm('Alarm');
    alarm.initialize();

    const reloadCheck = new ReloadCheck('ReloadCheck');
    reloadCheck.initialize();

    const soundEffect = new SoundEffect('SoundEffect');
    soundEffect.initialize();
  }

  private initializeChatTabs(): void {
    this.chatTabList.addChatTab('メインタブ', 'MainTab');
    this.chatTabList.addChatTab('サブタブ', 'SubTab');
  }

  private initializeAudioPresets(): void {
    AudioPlayer.resumeAudioContext();

    const addHidden = (path: string): string => {
      const file = this.audioStorage.add(path);
      file.isHidden = true;
      AudioTag.create(file.identifier).tag = 'SE';
      return file.identifier;
    };

    type SoundKey = Exclude<keyof typeof PresetSound, 'prototype'>;
    const soundMap: Record<SoundKey, string> = {
      dicePick: './assets/sounds/soundeffect-lab/shoulder-touch1.mp3',
      dicePut: './assets/sounds/soundeffect-lab/book-stack1.mp3',
      diceRoll1: './assets/sounds/on-jin/spo_ge_saikoro_teburu01.mp3',
      diceRoll2: './assets/sounds/on-jin/spo_ge_saikoro_teburu02.mp3',
      cardDraw: './assets/sounds/soundeffect-lab/card-turn-over1.mp3',
      cardPick: './assets/sounds/soundeffect-lab/shoulder-touch1.mp3',
      cardPut: './assets/sounds/soundeffect-lab/book-stack1.mp3',
      cardShuffle: './assets/sounds/soundeffect-lab/card-open1.mp3',
      piecePick: './assets/sounds/soundeffect-lab/shoulder-touch1.mp3',
      piecePut: './assets/sounds/soundeffect-lab/book-stack1.mp3',
      blockPick: './assets/sounds/tm2/tm2_pon002.wav',
      blockPut: './assets/sounds/tm2/tm2_pon002.wav',
      lock: './assets/sounds/tm2/tm2_switch001.wav',
      unlock: './assets/sounds/tm2/tm2_switch001.wav',
      sweep: './assets/sounds/tm2/tm2_swing003.wav',
      alarm: './assets/sounds/alarm/alarm.mp3',
    };

    for (const key of Object.keys(soundMap) as SoundKey[]) {
      PresetSound[key] = addHidden(soundMap[key]);
    }
  }

  private initializePeerCursor(): void {
    const fileContext = ImageFile.createEmpty('none_icon').toContext();
    fileContext.url = './assets/images/ic_account_circle_black_24dp_2x.png';
    const noneIconImage = this.imageStorage.add(fileContext);

    PeerCursor.createMyCursor();
    PeerCursor.myCursor.name = 'プレイヤー';
    PeerCursor.myCursor.imageIdentifier = noneIconImage.identifier;

    const storedIdentity = loadIdentity();
    if (storedIdentity) {
      PeerCursor.myCursor.reConnectPass = storedIdentity.reConnectPass;
      PeerCursor.myCursor.role = normalizePeerRole(storedIdentity.role);
    }
  }
}
