import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@axe/core/app-config.service';
import { initializeNetworkMessaging } from '@axe/core/network/network-messaging';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioSharingSystem } from '@axe/core/storage/audio-sharing-system';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageSharingSystem } from '@axe/core/storage/image-sharing-system';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
import { MarkDown } from '@axe/domain/data/mark-down';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/Jukebox';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { Config } from '@axe/domain/peer/config';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Alarm } from '@axe/domain/shared/alarm';
import { ReloadCheck } from '@axe/domain/shared/reload-check';
import { Vote } from '@axe/domain/shared/vote';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
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
  private readonly config = inject(Config);
  private readonly dataSummarySetting = inject(DataSummarySetting);
  private readonly ngSelectConfig = inject(NgSelectConfig);

  initialize(): void {
    initializeNetworkMessaging();
    this.fileArchiver.initialize();
    ImageSharingSystem.instance.initialize();
    AudioSharingSystem.instance.initialize();
    ObjectSynchronizer.instance.initialize();
    this.appConfigService.initialize();
    this.pointerDeviceService.initialize();
    this.ngSelectConfig.appendTo = 'body';

    this.tableSelecter.initialize();
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

    const markdown = new MarkDown('markdwon');
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
    PresetSound.dicePick = this.audioStorage.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.dicePut = this.audioStorage.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.diceRoll1 = this.audioStorage.add('./assets/sounds/on-jin/spo_ge_saikoro_teburu01.mp3').identifier;
    PresetSound.diceRoll2 = this.audioStorage.add('./assets/sounds/on-jin/spo_ge_saikoro_teburu02.mp3').identifier;
    PresetSound.cardDraw = this.audioStorage.add('./assets/sounds/soundeffect-lab/card-turn-over1.mp3').identifier;
    PresetSound.cardPick = this.audioStorage.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.cardPut = this.audioStorage.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.cardShuffle = this.audioStorage.add('./assets/sounds/soundeffect-lab/card-open1.mp3').identifier;
    PresetSound.piecePick = this.audioStorage.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.piecePut = this.audioStorage.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.blockPick = this.audioStorage.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;
    PresetSound.blockPut = this.audioStorage.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;
    PresetSound.lock = this.audioStorage.add('./assets/sounds/tm2/tm2_switch001.wav').identifier;
    PresetSound.unlock = this.audioStorage.add('./assets/sounds/tm2/tm2_switch001.wav').identifier;
    PresetSound.sweep = this.audioStorage.add('./assets/sounds/tm2/tm2_swing003.wav').identifier;
    PresetSound.alarm = this.audioStorage.add('./assets/sounds/alarm/alarm.mp3').identifier;

    this.audioStorage.get(PresetSound.dicePick).isHidden = true;
    this.audioStorage.get(PresetSound.dicePut).isHidden = true;
    this.audioStorage.get(PresetSound.diceRoll1).isHidden = true;
    this.audioStorage.get(PresetSound.diceRoll2).isHidden = true;
    this.audioStorage.get(PresetSound.cardDraw).isHidden = true;
    this.audioStorage.get(PresetSound.cardPick).isHidden = true;
    this.audioStorage.get(PresetSound.cardPut).isHidden = true;
    this.audioStorage.get(PresetSound.cardShuffle).isHidden = true;
    this.audioStorage.get(PresetSound.piecePick).isHidden = true;
    this.audioStorage.get(PresetSound.piecePut).isHidden = true;
    this.audioStorage.get(PresetSound.blockPick).isHidden = true;
    this.audioStorage.get(PresetSound.blockPut).isHidden = true;
    this.audioStorage.get(PresetSound.lock).isHidden = true;
    this.audioStorage.get(PresetSound.unlock).isHidden = true;
    this.audioStorage.get(PresetSound.sweep).isHidden = true;
    this.audioStorage.get(PresetSound.alarm).isHidden = true;
  }

  private initializePeerCursor(): void {
    const fileContext = ImageFile.createEmpty('none_icon').toContext();
    fileContext.url = './assets/images/ic_account_circle_black_24dp_2x.png';
    const noneIconImage = this.imageStorage.add(fileContext);

    PeerCursor.createMyCursor();
    PeerCursor.myCursor.name = 'プレイヤー';
    PeerCursor.myCursor.imageIdentifier = noneIconImage.identifier;
  }
}
