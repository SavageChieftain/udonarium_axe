import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { ChatPalette, PaletteIndex } from '@axe/domain/chat/chat-palette';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatInputComponent } from '@axe/features/chat/chat-input/chat-input.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { BadgeComponent } from '@axe/shared/components/badge/badge.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-palette',
  templateUrl: './chat-palette.component.html',
  styleUrls: ['./chat-palette.component.css'],
  imports: [FormsModule, BadgeComponent, ChatInputComponent],
})
export class ChatPaletteComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  chatMessageService = inject(ChatMessageService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rootElementRef = viewChild.required<ElementRef<HTMLElement>>('root');
  readonly chatInputComponent = viewChild.required<ChatInputComponent>('chatInput');
  readonly chatPaletteElementRef = viewChild<ElementRef<HTMLSelectElement>>('chatPalette');
  readonly completeSelectRef = viewChild<ElementRef<HTMLSelectElement>>('completeSelect');
  readonly editTextRef = viewChild<ElementRef<HTMLTextAreaElement>>('editText');
  readonly character = signal<GameCharacter | null>(null);

  get palette(): ChatPalette | null {
    return this.character()?.chatPalette ?? null;
  }

  private _gameType: string = '';
  private _paletteIndex: PaletteIndex[] = [];
  private _timeId: string = '';
  private _autoCompleteEnable = false;
  private _completeIndex = -1;

  get gameType(): string {
    return this._gameType;
  }
  set gameType(gameType: string) {
    this._gameType = gameType;
    const char = this.character();
    if (char?.chatPalette) char.chatPalette.dicebot = gameType;
  }

  get sendFrom(): string {
    return this.character()?.identifier ?? '';
  }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  readonly chatTabidentifier = signal('');
  text: string = '';
  sendTo: string = '';

  readonly isEdit = signal(false);
  readonly editPalette = signal('');

  /** 全タブの unreadLength 変化に反応させるための computed signal。 */
  readonly chatTabsVersion = computed(() => {
    this.objectChange.collectionOf('chat-tab')();
    const tabs = this.chatMessageService.chatTabs;
    for (const tab of tabs) this.objectChange.versionOf(tab.identifier)();
    return tabs;
  });

  private doubleClickTimer: NodeJS.Timeout | null = null;
  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return this.objectStore.getObjects(PeerCursor);
  }

  constructor() {
    queueMicrotask(() => this.updatePanelTitle());
    this.chatTabidentifier.set(this.chatMessageService.chatTabs[0]?.identifier ?? '');
    const char = this.character();
    this.gameType = char?.chatPalette ? char.chatPalette.dicebot : '';
    this._timeId = Date.now() + '_chat-palette';
    this.objectChange.objectDeleted$.subscribe((e) => {
      if (this.character() && this.character()!.identifier === e.identifier) {
        this.panelService.close();
      }
      if (this.chatTabidentifier() === e.identifier) {
        this.chatTabidentifier.set(this.chatMessageService.chatTabs[0]?.identifier ?? '');
      }
    }, this.destroyRef);
    effect(() => {
      const req = this.uiSignalService.jumpIndexRequest();
      if (!req || this._timeId != req.targetId) return;
      this.japmIndex(req.lineNo);
    });
    this.destroyRef.onDestroy(() => {
      if (this.isEdit()) this.toggleEditMode();
    });
  }

  updatePanelTitle() {
    this.panelService.title = this.character() ? this.character()!.name + ' のチャットパレット' : 'チャットパレット';
  }

  onSelectedCharacter(identifier: string) {
    if (this.isEdit()) this.toggleEditMode();
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      this.character.set(object);
      const char = this.character()!;
      const gameType = char.chatPalette ? char.chatPalette.dicebot : '';
      if (0 < gameType.length) this.gameType = gameType;
    }
    this.updatePanelTitle();
  }

  resizeChatInput() {
    this.chatInputComponent().kickCalcFitHeight();
  }

  chatTabSwitchRelative(direction: number) {
    const chatTabs = this.chatMessageService.chatTabs;
    const index = chatTabs.findIndex((elm) => elm.identifier == this.chatTabidentifier());
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
    this.chatTabidentifier.set(chatTabs[nextIndex].identifier);
  }

  autoCompleteSwitchRelative(direction: number) {
    const selectObj = this.completeSelectRef()?.nativeElement;
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
    const selectObj = this.completeSelectRef()?.nativeElement;
    if (!selectObj || index != selectObj.selectedIndex) return;
    this.selectAutoComplete(this.text, selectObj.value);
  }

  selectPalette(line: string) {
    const multiLine = line.replace(/\\n/g, '\n');
    this.text = multiLine;
    const selectObj = this.completeSelectRef()?.nativeElement;
    if (selectObj) {
      selectObj.selectedIndex = -1;
    }
    this._completeIndex = -1;
  }

  selectAutoComplete(text: string, selectText: string) {
    const selectObj = this.completeSelectRef()?.nativeElement;
    if (!selectObj || !this.palette) return;
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
      paletteMatch = this.palette?.paletteMatch(this.text) ?? [];
    }
    return paletteMatch;
  }

  clickPalette(line: string) {
    const multiLine = line.replace(/\\n/g, '\n');
    if (this.doubleClickTimer && this.text === multiLine) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
      this.chatInputComponent().sendChat(null);
    } else {
      this.text = multiLine;
      this.doubleClickTimer = setTimeout(() => {
        this.doubleClickTimer = null;
      }, 400);
    }
  }

  private targeted(gameCharacter: GameCharacter): boolean {
    if (gameCharacter.location.name != 'table') return false;
    return gameCharacter.targeted;
  }

  private targetedGameCharacterList(): GameCharacter[] {
    const objects = this.objectStore
      .getObjects<GameCharacter>(GameCharacter)
      .filter((character) => this.targeted(character));
    return objects;
  }

  sendChat(value: {
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    portraitIndex: number;
    messColor: string;
  }) {
    const character = this.character();
    const palette = this.palette;
    if (this.chatTab && character && palette) {
      let outtext = '';
      let objects: GameCharacter[];
      const messageTargetContext: ChatMessageTargetContext[] = [];
      if (palette.checkTargetCharacter(value.text)) {
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

          outtext += palette.evaluate(str2, character.rootDataElement ?? undefined, object);
          outtext += ' [' + object.name + ']';
          first = false;

          const targetContext: ChatMessageTargetContext = {
            text: '',
            object: null,
          };
          targetContext.text = palette.evaluate(str2, character.rootDataElement ?? undefined, object);
          targetContext.object = object;
          messageTargetContext.push(targetContext);
        }
      } else {
        outtext = palette.evaluate(value.text, character.rootDataElement ?? undefined);
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
        value.portraitIndex,
        value.messColor,
        messageTargetContext
      );
      // this.chatMessageService.sendMessage(this.chatTab, text, value.gameType, value.sendFrom, value.sendTo);
    }
  }

  resetPaletteSelect() {
    const el = this.chatPaletteElementRef()?.nativeElement;
    if (!el) return;
    el.selectedIndex = -1;
  }

  toggleEditMode() {
    this.isEdit.update((v) => !v);
    if (!this.palette) return;
    if (this.isEdit()) {
      const selectEl = this.chatPaletteElementRef()?.nativeElement;
      this.editPalette.set(this.palette.value + '');
      const selectTop = selectEl?.scrollTop ?? 0;
      const selectHeight = selectEl?.scrollHeight ?? 1;
      setTimeout(() => {
        const textEl = this.editTextRef()?.nativeElement;
        if (textEl) {
          textEl.scrollTop = (selectTop * textEl.scrollHeight) / selectHeight;
        }
      }, 10);
    } else {
      this.palette.setPalette(this.editPalette());
    }
  }

  moveTest() {
    const textEl = this.editTextRef()?.nativeElement;
    if (!textEl) return;
    textEl.focus();
    setTimeout(() => {
      textEl.setSelectionRange(600, 600);
    }, 10);
  }

  japmIndex(lineNo: number) {
    const select = this.chatPaletteElementRef()?.nativeElement;
    if (select) {
      select.scrollTop = select.scrollHeight;
      select.options[lineNo].selected = false;
      select.options[lineNo].selected = true;
    }
  }

  onSelectAutoComplete(text: string, event: Event): void {
    this.selectAutoComplete(text, (event.target as HTMLInputElement).value);
  }
  onSelectPalette(event: Event): void {
    this.selectPalette((event.target as HTMLInputElement).value);
  }
  onClickPalette(event: Event): void {
    this.clickPalette((event.target as HTMLInputElement).value);
  }

  indexBtn() {
    if (!this.palette) return;
    const panel: HTMLElement = this.rootElementRef().nativeElement;
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
