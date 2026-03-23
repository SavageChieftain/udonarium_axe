import { AfterViewInit, Component, inject, NgZone, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { Alarm } from '@axe/class/alarm';
import { ChatTabList } from '@axe/class/chat-tab-list';
import { Config } from '@axe/class/config';
import { AudioPlayer } from '@axe/class/core/file-storage/audio-player';
import { AudioSharingSystem } from '@axe/class/core/file-storage/audio-sharing-system';
import { AudioStorage } from '@axe/class/core/file-storage/audio-storage';
import { FileArchiver } from '@axe/class/core/file-storage/file-archiver';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageSharingSystem } from '@axe/class/core/file-storage/image-sharing-system';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { ObjectSynchronizer } from '@axe/class/core/synchronize-object/object-synchronizer';
import { EventSystem, Network } from '@axe/class/core/system';
import { CutIn } from '@axe/class/cut-in';
import { CutInLauncher } from '@axe/class/cut-in-launcher';
import { DataSummarySetting } from '@axe/class/data-summary-setting';
import { DiceBot } from '@axe/class/dice-bot';
import { Jukebox } from '@axe/class/Jukebox';
import { MarkDown } from '@axe/class/mark-down';
import { PeerCursor } from '@axe/class/peer-cursor';
import { ReloadCheck } from '@axe/class/reload-check';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { TableSelecter } from '@axe/class/table-selecter';
import { Vote } from '@axe/class/vote';
import { NgSelectConfig } from '@ng-select/ng-select';
import { AlarmWindowComponent } from '@axe/component/alarm-window/alarm-window.component';
import { ChatWindowComponent } from '@axe/component/chat-window/chat-window.component';
import { ContextMenuComponent } from '@axe/component/context-menu/context-menu.component';
import { CutInWindowComponent } from '@axe/component/cut-in-window/cut-in-window.component';
import { FileStorageComponent } from '@axe/component/file-storage/file-storage.component';
import { GameCharacterGeneratorComponent } from '@axe/component/game-character-generator/game-character-generator.component';
import { GameCharacterSheetComponent } from '@axe/component/game-character-sheet/game-character-sheet.component';
import { GameObjectInventoryComponent } from '@axe/component/game-object-inventory/game-object-inventory.component';
import { GameTableSettingComponent } from '@axe/component/game-table-setting/game-table-setting.component';
import { JukeboxComponent } from '@axe/component/jukebox/jukebox.component';
import { ModalComponent } from '@axe/component/modal/modal.component';
import { PeerMenuComponent } from '@axe/component/peer-menu/peer-menu.component';
import { TextViewComponent } from '@axe/component/text-view/text-view.component';
import { UIPanelComponent } from '@axe/component/ui-panel/ui-panel.component';
import { VoteWindowComponent } from '@axe/component/vote-window/vote-window.component';
import { AppConfig, AppConfigService } from '@axe/service/app-config.service';
import { ChatMessageService } from '@axe/service/chat-message.service';
import { ContextMenuService } from '@axe/service/context-menu.service';
import { ModalService } from '@axe/service/modal.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { SaveDataService } from '@axe/service/save-data.service';

import { GameTableComponent } from './component/game-table/game-table.component';
import { NetworkIndicatorComponent } from './component/network-indicator/network-indicator.component';
import { UIPanelComponent as UIPanelComponent_1 } from './component/ui-panel/ui-panel.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [GameTableComponent, UIPanelComponent_1, NetworkIndicatorComponent],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private chatMessageService = inject(ChatMessageService);
  private appConfigService = inject(AppConfigService);
  private saveDataService = inject(SaveDataService);
  private ngSelectConfig = inject(NgSelectConfig);
  private ngZone = inject(NgZone);

  private objectStore = inject(ObjectStore);
  private fileArchiver = inject(FileArchiver);
  private imageStorage = inject(ImageStorage);
  private audioStorage = inject(AudioStorage);
  private chatTabList = inject(ChatTabList);
  private tableSelecter = inject(TableSelecter);
  private config = inject(Config);
  private dataSummarySetting = inject(DataSummarySetting);

  @ViewChild('modalLayer', { read: ViewContainerRef, static: true })
  modalLayerViewContainerRef!: ViewContainerRef;

  get reloadCheck(): ReloadCheck {
    return this.objectStore.get<ReloadCheck>('ReloadCheck');
  }
  networkService = Network;

  private immediateUpdateTimer: number = null!;
  private lazyUpdateTimer: number = null!;
  private openPanelCount = 0;
  isSaveing = false;
  progresPercent = 0;
  dispcounter = 10; // 表示更新用ダミーカットインを閉じるときに無理やり更新させている。

  constructor() {
    this.ngZone.runOutsideAngular(() => {
      void EventSystem;
      void Network;
      this.fileArchiver.initialize();
      ImageSharingSystem.instance.initialize();
      AudioSharingSystem.instance.initialize();
      ObjectSynchronizer.instance.initialize();
    });
    this.appConfigService.initialize();
    this.pointerDeviceService.initialize();
    this.ngSelectConfig.appendTo = 'body';

    this.tableSelecter.initialize();
    this.chatTabList.initialize();

    this.config.initialize();

    this.dataSummarySetting.initialize();

    const diceBot: DiceBot = new DiceBot('DiceBot');
    diceBot.initialize();
    DiceBot.getHelpMessage('').then(() => this.lazyNgZoneUpdate(true));

    const jukebox: Jukebox = new Jukebox('Jukebox');
    jukebox.initialize();

    const markdown: MarkDown = new MarkDown('markdwon');
    markdown.initialize();

    const cutInLauncher = new CutInLauncher('CutInLauncher');
    cutInLauncher.initialize();

    const vote = new Vote('Vote');
    vote.initialize();

    const alarm = new Alarm('Alarm');
    alarm.initialize();

    const reloadCheck = new ReloadCheck('ReloadCheck');
    reloadCheck.initialize();

    const soundEffect: SoundEffect = new SoundEffect('SoundEffect');
    soundEffect.initialize();

    this.chatTabList.addChatTab('メインタブ', 'MainTab');
    this.chatTabList.addChatTab('サブタブ', 'SubTab');

    const fileContext = ImageFile.createEmpty('none_icon').toContext();
    fileContext.url = './assets/images/ic_account_circle_black_24dp_2x.png';
    const noneIconImage = this.imageStorage.add(fileContext);

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

    PeerCursor.createMyCursor();
    PeerCursor.myCursor.name = 'プレイヤー';
    PeerCursor.myCursor.imageIdentifier = noneIconImage.identifier;

    EventSystem.register(this)
      .on('ALARM_TIMEUP_ORIGIN', (event) => {
        this.alarmTimeUpOrigin(event.data.text);
      })
      .on('ALARM_POP', (event) => {
        this.alarmPop(event.data.title, String(event.data.time));
      })
      .on('START_VOTE', (_event) => {
        this.startVote();
      })
      .on('FINISH_VOTE', (event) => {
        this.finishVote(event.data.text);
      })
      .on<{ cutIn: CutIn }>('START_CUT_IN', (event) => {
        this.startCutIn(event.data.cutIn);
      })
      .on<{ cutIn: CutIn }>('STOP_CUT_IN', (event) => {
        if (!event.data.cutIn) return;
      })
      .on('UPDATE_GAME_OBJECT', (event) => {
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      })
      .on('LOCAL_OBJECT_UPDATED', (_event) => {
        this.lazyNgZoneUpdate(true);
      })
      .on('DELETE_GAME_OBJECT', (event) => {
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      })
      .on('SYNCHRONIZE_AUDIO_LIST', (event) => {
        if (event.isSendFromSelf) this.lazyNgZoneUpdate(false);
      })
      .on('SYNCHRONIZE_FILE_LIST', (event) => {
        if (event.isSendFromSelf) this.lazyNgZoneUpdate(false);
      })
      .on<AppConfig>('LOAD_CONFIG', (event) => {
        Network.configure(event.data as unknown as Record<string, unknown>);
        Network.open();
      })
      .on<File>('FILE_LOADED', (_event) => {
        this.lazyNgZoneUpdate(false);
      })
      .on('OPEN_NETWORK', (_event) => {
        PeerCursor.myCursor.peerId = Network.peerContext.peerId;
        PeerCursor.myCursor.userId = Network.peerContext.userId;
      })
      .on('NETWORK_ERROR', (event) => {
        const errorType: string = event.data.errorType;
        const errorMessage: string = event.data.errorMessage;

        this.ngZone.run(async () => {
          //SKyWayエラーハンドリング
          const quietErrorTypes = ['peer-unavailable'];
          const reconnectErrorTypes = [
            'disconnected',
            'socket-error',
            'unavailable-id',
            'authentication',
            'server-error',
          ];

          if (quietErrorTypes.includes(errorType)) return;
          await this.modalService.open(TextViewComponent, {
            title: 'ネットワークエラー',
            text: errorMessage,
          });

          if (!reconnectErrorTypes.includes(errorType)) return;
          await this.modalService.open(TextViewComponent, {
            title: 'ネットワークエラー',
            text: 'このウィンドウを閉じると再接続を試みます。',
          });
          Network.open();
        });
      })
      .on('CONNECT_PEER', (event) => {
        if (event.isSendFromSelf) this.chatMessageService.calibrateTimeOffset();
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      })
      .on('DISCONNECT_PEER', (event) => {
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      });
  }

  ngAfterViewInit() {
    PanelService.defaultParentViewContainerRef =
      ModalService.defaultParentViewContainerRef =
      ContextMenuService.defaultParentViewContainerRef =
        this.modalLayerViewContainerRef;
    setTimeout(() => {
      this.panelService.open(PeerMenuComponent, {
        width: 500,
        height: 450,
        left: 100,
      });
      this.panelService.open(ChatWindowComponent, {
        width: 700,
        height: 400,
        left: 100,
        top: 450,
      });
    }, 0);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  alarmTimeUpOrigin(text: string) {
    this.chatMessageService.sendSystemMessageLastSendCharactor(text);
  }

  alarmTimeUpTarget(text: string) {
    this.chatMessageService.sendSystemMessageLastSendCharactor(text);
  }

  startVote() {
    const vote = this.objectStore.get<Vote>('Vote');
    if (!vote.chkToMe()) return;

    const option: PanelOption = { left: 0, top: 0, width: 450, height: 400 };
    option.title = '点呼/投票';

    let margin_w = (window.innerWidth - option.width!) / 2;
    let margin_h = (window.innerHeight - option.height!) / 2;
    if (margin_w < 0) margin_w = 0;
    if (margin_h < 0) margin_h = 0;
    option.left = margin_w;
    option.top = margin_h;
    this.panelService.open(VoteWindowComponent, option);
  }

  finishVote(text: string) {
    this.chatMessageService.sendSystemMessageLastSendCharactor(text);
  }

  alarmPop(title: string, time: string) {
    const winH = 100;
    const winW = 200;
    const option: PanelOption = {
      width: winW,
      height: winH,
      left: 300,
      top: 100,
    };
    option.title = 'アラーム ' + title;

    let margin_w = window.innerWidth - winW;
    let margin_h = window.innerHeight - winH - 25;

    if (margin_w < 0) margin_w = 0;
    if (margin_h < 0) margin_h = 0;

    const margin_x = margin_w * 0.5;
    const margin_y = margin_h * 0.5;

    option.width = winW;
    option.height = winH + 25;
    option.left = margin_x;
    option.top = margin_y;

    const component = this.panelService.open(AlarmWindowComponent, option);
    component.title = title;
    component.time = time;
  }

  startCutIn(cutIn: CutIn) {
    if (!cutIn) return;
    const option: PanelOption = { width: 200, height: 100, left: 300, top: 100 };
    option.title = 'カットイン : ' + cutIn.name;

    const cutin_w = cutIn.width;
    const cutin_h = cutIn.height;

    let margin_w = window.innerWidth - cutin_w;
    let margin_h = window.innerHeight - cutin_h - 25;

    if (margin_w < 0) margin_w = 0;
    if (margin_h < 0) margin_h = 0;

    const margin_x = (margin_w * cutIn.x_pos) / 100;
    const margin_y = (margin_h * cutIn.y_pos) / 100;

    option.width = cutin_w;
    option.height = cutin_h + 25;
    option.left = margin_x;
    option.top = margin_y;
    option.isCutIn = true;
    option.cutInIdentifier = cutIn.identifier;

    const component = this.panelService.open(CutInWindowComponent, option);
    component.cutIn = cutIn;
    component.startCutIn();
  }

  open(componentName: string) {
    let component: { new (...args: unknown[]): unknown } | null = null;
    let option: PanelOption = { width: 450, height: 600, left: 100 };
    switch (componentName) {
      case 'PeerMenuComponent':
        component = PeerMenuComponent;
        break;
      case 'ChatWindowComponent':
        component = ChatWindowComponent;
        option.width = 700;
        break;
      case 'GameTableSettingComponent':
        component = GameTableSettingComponent;
        option = { width: 630, height: 500, left: 100 };
        break;
      case 'FileStorageComponent':
        component = FileStorageComponent;
        break;
      case 'GameCharacterSheetComponent':
        component = GameCharacterSheetComponent;
        break;
      case 'JukeboxComponent':
        component = JukeboxComponent;
        break;
      case 'GameCharacterGeneratorComponent':
        component = GameCharacterGeneratorComponent;
        option = { width: 500, height: 300, left: 100 };
        break;
      case 'GameObjectInventoryComponent':
        component = GameObjectInventoryComponent;
        break;
    }
    if (component) {
      option.top = ((this.openPanelCount % 10) + 1) * 20;
      option.left = 100 + ((this.openPanelCount % 20) + 1) * 5;
      this.openPanelCount = this.openPanelCount + 1;
      this.panelService.open(component, option);
    }
  }

  async save() {
    if (this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    const roomName =
      Network.peerContext && 0 < Network.peerContext.roomName.length ? Network.peerContext.roomName : 'ルームデータ';
    await this.saveDataService.saveRoomAsync(roomName, (percent) => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  handleFileSelect(event: Event) {
    const input = <HTMLInputElement>event.target;
    const files = input.files;

    this.reloadCheck.reloadCheckStart(this.networkService.peerContext.roomName != '');

    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  private lazyNgZoneUpdate(isImmediate: boolean) {
    if (isImmediate) {
      if (this.immediateUpdateTimer !== null) return;
      this.immediateUpdateTimer = requestAnimationFrame(() => {
        this.immediateUpdateTimer = null!;
        if (this.lazyUpdateTimer !== null) {
          cancelAnimationFrame(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null!;
        }
        this.ngZone.run(() => {});
      });
    } else {
      if (this.lazyUpdateTimer !== null) return;
      this.lazyUpdateTimer = requestAnimationFrame(() => {
        this.lazyUpdateTimer = null!;
        if (this.immediateUpdateTimer !== null) {
          cancelAnimationFrame(this.immediateUpdateTimer);
          this.immediateUpdateTimer = null!;
        }
        this.ngZone.run(() => {});
      });
    }
  }
}

PanelService.UIPanelComponentClass = UIPanelComponent;
ContextMenuService.ContextMenuComponentClass = ContextMenuComponent;
ModalService.ModalComponentClass = ModalComponent;
