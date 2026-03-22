import { Component, ElementRef, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageTargetContext } from '@axe/chat-message';
import { ChatPalette, PaletteIndex } from '@axe/chat-palette';
import { ChatTab } from '@axe/chat-tab';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { DiceBot } from '@axe/dice-bot';
import { GameCharacter } from '@axe/game-character';
import { PeerCursor } from '@axe/peer-cursor';
import GameSystemClass from 'bcdice/lib/game_system';
import { BadgeComponent } from 'component/badge/badge.component';
import { ChatInputComponent } from 'component/chat-input/chat-input.component';
import { ChatInputComponent as ChatInputComponent_1 } from 'component/chat-input/chat-input.component';
import { ChatMessageService } from 'service/chat-message.service';
import { ContextMenuService } from 'service/context-menu.service';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

@Component({
  selector: 'chat-palette',
  templateUrl: './chat-palette.component.html',
  styleUrls: ['./chat-palette.component.css'],
  imports: [FormsModule, BadgeComponent, ChatInputComponent_1],
})
export class ChatPaletteComponent implements OnInit, OnDestroy {
  private contextMenuService = inject(ContextMenuService);
  private pointerDeviceService = inject(PointerDeviceService);
  chatMessageService = inject(ChatMessageService);
  private panelService = inject(PanelService);

  @ViewChild('root', { static: true }) rootElementRef: ElementRef<HTMLElement>;
  @ViewChild('chatInput', { static: true }) chatInputComponent: ChatInputComponent;
  @ViewChild('chatPalette') chatPaletteElementRef: ElementRef<HTMLSelectElement>;
  @Input() character: GameCharacter = null!;

  get palette(): ChatPalette {
    return this.character.chatPalette;
  }

  private _gameType: string = '';
  private _paletteIndex: PaletteIndex[] = [];
  /* private */ _timeId: string = '';
  private _autoCompleteEnable = false;
  private _completeIndex = -1;

  get gameType(): string {
    return this._gameType;
  }
  set gameType(gameType: string) {
    this._gameType = gameType;
    if (this.character.chatPalette) this.character.chatPalette.dicebot = gameType;
  }

  get sendFrom(): string {
    return this.character.identifier;
  }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  chatTabidentifier: string = '';
  text: string = '';
  sendTo: string = '';

  isEdit: boolean = false;
  isIndexOpen: boolean = false;
  editPalette: string = '';

  private doubleClickTimer: NodeJS.Timeout = null!;
  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  get chatTab(): ChatTab {
    return ObjectStore.instance.get<ChatTab>(this.chatTabidentifier);
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return ObjectStore.instance.getObjects(PeerCursor);
  }

  ngOnInit() {
    queueMicrotask(() => this.updatePanelTitle());
    this.chatTabidentifier = this.chatMessageService.chatTabs ? this.chatMessageService.chatTabs[0].identifier : '';
    this.gameType = this.character.chatPalette ? this.character.chatPalette.dicebot : '';
    this._timeId = Date.now() + '_chat-palette';
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', (event) => {
        if (this.character && this.character.identifier === event.data.identifier) {
          this.panelService.close();
        }
        if (this.chatTabidentifier === event.data.identifier) {
          this.chatTabidentifier = this.chatMessageService.chatTabs
            ? this.chatMessageService.chatTabs[0].identifier
            : '';
        }
      })
      .on('JUMP_INDEX', -1000, (event) => {
        if (this._timeId != event.data.targetId) {
          return;
        }
        this.japmIndex(event.data.lineNo);
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.isEdit) this.toggleEditMode();
  }

  updatePanelTitle() {
    this.panelService.title = this.character.name + ' のチャットパレット';
  }

  onSelectedCharacter(identifier: string) {
    if (this.isEdit) this.toggleEditMode();
    const object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      this.character = object;
      const gameType = this.character.chatPalette ? this.character.chatPalette.dicebot : '';
      if (0 < gameType.length) this.gameType = gameType;
    }
    this.updatePanelTitle();
  }

  resizeChatInput() {
    this.chatInputComponent.kickCalcFitHeight();
  }

  chatTabSwitchRelative(direction: number) {
    const chatTabs = this.chatMessageService.chatTabs;
    const index = chatTabs.findIndex((elm) => elm.identifier == this.chatTabidentifier);
    if (index < 0) {
      return;
    }

    let nextIndex: number;
    if (index == chatTabs.length - 1 && direction == 1) {
      nextIndex = 0;
    } else if (index == 0 && direction == -1) {
      nextIndex = chatTabs.length - 1;
    } else {
      nextIndex = index + direction;
    }
    this.chatTabidentifier = chatTabs[nextIndex].identifier;
  }

  autoCompleteSwitchRelative(direction: number) {
    const selectObj = <HTMLSelectElement>document.getElementById(this._timeId + '_complete');
    if (!selectObj) {
      return;
    }

    const optionNum = selectObj.length;
    let newIndex = selectObj.selectedIndex;
    newIndex += direction;
    if (newIndex <= -1) {
      return;
    }
    if (newIndex >= optionNum) {
      newIndex = optionNum - 1;
    }
    selectObj.selectedIndex = newIndex;
    this._completeIndex = newIndex;
  }

  autoCompleteDoRelative(index: number) {
    const selectObj = <HTMLSelectElement>document.getElementById(this._timeId + '_complete');
    if (index != selectObj.selectedIndex) return;
    this.selectAutoComplete(this.text, selectObj.value);
  }

  selectPalette(line: string) {
    const multiLine = line.replace(/\\n/g, '\n');
    this.text = multiLine;
    const selectObj = <HTMLSelectElement>document.getElementById(this._timeId + '_complete');
    if (selectObj) {
      selectObj.selectedIndex = -1;
    }
    this._completeIndex = -1;
  }

  selectAutoComplete(text: string, selectText: string) {
    const selectObj = <HTMLSelectElement>document.getElementById(this._timeId + '_complete');
    const lineNo = this.palette.paletteMatchLine(text, selectObj.selectedIndex);
    this.japmIndex(lineNo);
    this.selectPalette(selectText);
  }

  completeIndex(): number {
    return this._completeIndex;
  }

  autoCompleteList(): string[] {
    let paletteMatch: string[] = [];
    if (this.text.length > 1) {
      paletteMatch = this.palette.paletteMatch(this.text);
    }
    return paletteMatch;
  }

  clickPalette(line: string) {
    const multiLine = line.replace(/\\n/g, '\n');
    if (this.doubleClickTimer && this.text === multiLine) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null!;
      this.chatInputComponent.sendChat(null!);
    } else {
      this.text = multiLine;
      this.doubleClickTimer = setTimeout(() => {
        this.doubleClickTimer = null!;
      }, 400);
    }
  }

  private targeted(gameCharacter: GameCharacter): boolean {
    if (gameCharacter.location.name != 'table') return false;
    return gameCharacter.targeted;
  }

  private targetedGameCharacterList(): GameCharacter[] {
    const objects = ObjectStore.instance
      .getObjects<GameCharacter>(GameCharacter)
      .filter((character) => this.targeted(character));
    return objects;
  }

  sendChat(value: {
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  }) {
    if (this.chatTab) {
      let outtext = '';
      let objects: GameCharacter[];
      const messageTargetContext: ChatMessageTargetContext[] = [];
      if (this.palette.checkTargetCharactor(value.text)) {
        objects = this.targetedGameCharacterList();
        let first = true;
        if (objects.length == 0) {
          outtext += '対象が未選択です';
        }

        for (const object of objects) {
          outtext += first ? '' : '\n';
          const str = value.text;
          let str2: string;
          if (first) {
            str2 = str;
          } else {
            //自分リソース操作指定の省略
            str2 = DiceBot.deleteMyselfResourceBuff(str);
          }

          outtext += this.palette.evaluate(str2, this.character.rootDataElement, object);
          outtext += ' [' + object.name + ']';
          first = false;

          const targetContext: ChatMessageTargetContext = {
            text: '',
            object: null,
          };
          targetContext.text = this.palette.evaluate(str2, this.character.rootDataElement, object);
          targetContext.object = object;
          messageTargetContext.push(targetContext);
        }
      } else {
        outtext = this.palette.evaluate(value.text, this.character.rootDataElement);
        const targetContext: ChatMessageTargetContext = {
          text: '',
          object: null,
        };
        targetContext.text = outtext;
        targetContext.object = null;
        messageTargetContext.push(targetContext);
      }
      this.chatMessageService.sendMessage(
        this.chatTab,
        outtext,
        value.gameSystem,
        value.sendFrom,
        value.sendTo,
        value.tachieNum,
        value.messColor,
        messageTargetContext
      );
      // this.chatMessageService.sendMessage(this.chatTab, text, value.gameType, value.sendFrom, value.sendTo);
    }
  }

  resetPaletteSelect() {
    if (!this.chatPaletteElementRef.nativeElement) return;
    this.chatPaletteElementRef.nativeElement.selectedIndex = -1;
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
    if (this.isEdit) {
      const selectObj = document.getElementById(this._timeId + '_select')!;
      const textObj = document.getElementById(this._timeId + '_text')!;
      /*
      const lineNum = this.palette.getPalette().length;
*/
      this.editPalette = this.palette.value + '';
      const selectTop = selectObj.scrollTop;
      const selectHeight = selectObj.scrollHeight;
      /*
      const centerLine = lineNum > 0 ? (selectObj.clientHeight/2 + selectObj.scrollHeight) / lineNum : lineNum;
*/
      setTimeout(() => {
        textObj.scrollTop = (selectTop * textObj.scrollHeight) / selectHeight;
      }, 10);
    } else {
      this.palette.setPalette(this.editPalette);
    }
  }

  moveTest() {
    const textObj = <HTMLInputElement>document.getElementById(this._timeId + '_text');
    textObj.focus();
    setTimeout(() => {
      textObj.setSelectionRange(600, 600);
    }, 10);
  }

  japmIndex(lineNo: number) {
    const select = <HTMLSelectElement>document.getElementById(this._timeId + '_select');
    if (select) {
      select.scrollTop = select.scrollHeight;
      select.options[lineNo].selected = false;
      select.options[lineNo].selected = true;
    }
  }

  indexBtn() {
    const panel: HTMLElement = this.rootElementRef.nativeElement;
    const panelBox = panel.getBoundingClientRect();

    const position = this.pointerDeviceService.pointers[0];
    position.x = panelBox.left - 8;
    position.y = panelBox.top - 8;

    this._paletteIndex = this.palette.paletteIndex;

    const index = [];
    for (const list of this._paletteIndex) {
      index.push({ name: list.name, line: list.line, id: this._timeId, action: () => {} }); // ここでのactionはダミー、実行されない
    }

    this.contextMenuService.open(position, index, 'インデックス');
  }
}
