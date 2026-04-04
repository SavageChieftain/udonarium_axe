import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml, ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatLogExporter } from '@axe/domain/chat/chat-log-exporter';
import { ChatMessage, ChatMessageContext } from '@axe/domain/chat/chat-message';
import { emitMessageAdded } from '@axe/domain/domain-events';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';

const PORTRAIT_SLOT_COUNT = 12;
const DEFAULT_IMAGE_IDENTIFIERS: readonly string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];

@SyncObject('chat-tab')
export class ChatTab extends ObjectNode implements InnerXml {
  @SyncVar() name = 'タブ';

  @SyncVar() pos_num = -1;
  @SyncVar() imageIdentifier: string[] = [...DEFAULT_IMAGE_IDENTIFIERS];
  @SyncVar('imageCharactorName') imageCharacterName: string[] = Array.from(
    { length: PORTRAIT_SLOT_COUNT },
    (_, i) => `#${i}`
  );
  @SyncVar() imageIdentifierZpos: number[] = Array.from({ length: PORTRAIT_SLOT_COUNT }, (_, i) => i);

  @SyncVar() count = 0;
  @SyncVar() imageIdentifierDummy = 'test'; // 通信開始ために使わなくても書かなきゃだめっぽい後日見直し

  get cutInLauncher(): CutInLauncher | null {
    return ObjectStore.instance.get<CutInLauncher>('CutInLauncher');
  }

  private _displayableMessageNum = 0;
  displayableMessagesLength(): number {
    return this._displayableMessageNum;
  }

  portraitReset() {
    this.imageIdentifier = [...DEFAULT_IMAGE_IDENTIFIERS];
    this.imageCharacterName = Array.from({ length: PORTRAIT_SLOT_COUNT }, (_, i) => `#${i}`);
    this.imageIdentifierZpos = Array.from({ length: PORTRAIT_SLOT_COUNT }, (_, i) => i);
    this.imageIdentifierDummy = 'test';
  }

  imageDispFlag: boolean[] = Array(PORTRAIT_SLOT_COUNT).fill(true) as boolean[];

  get chatMessages(): readonly ChatMessage[] {
    return this.children as readonly ChatMessage[];
  }

  get imageZposList(): number[] {
    const ret: number[] = this.imageIdentifierZpos.slice();
    return ret;
  }

  getImageCharactorPos(name: string) {
    for (let i = 0; i < this.imageCharacterName.length; i++) {
      if (name == this.imageCharacterName[i]) {
        return i;
      }
    }
    return -1;
  }

  hidePortraitPos(pos: number) {
    this.imageDispFlag[pos] = false;
  }

  isPortraitPosVisible(pos: number): boolean {
    return this.imageDispFlag[pos];
  }

  portraitZIndex(toppos: number): number {
    const index = this.imageIdentifierZpos.indexOf(Number(toppos));
    return index;
  }

  public chatSimpleDispFlag = 0;
  public portraitDisplayFlag = 1;

  replacePortraitZIndex(toppos: number) {
    const index = this.imageIdentifierZpos.indexOf(Number(toppos));
    if (index >= 0) {
      this.imageIdentifierZpos.splice(index, 1);
      this.imageIdentifierZpos.push(Number(toppos));
    }
  }

  private _dispCharctorIcon = true;
  get dispCharctorIcon(): boolean {
    return this._dispCharctorIcon;
  }
  set dispCharctorIcon(flag: boolean) {
    this._dispCharctorIcon = flag;
  }

  private _unreadLength = 0;
  get unreadLength(): number {
    return this._unreadLength;
  }
  get hasUnread(): boolean {
    return this.unreadLength > 0;
  }

  get latestTimeStamp(): number {
    const lastIndex = this.chatMessages.length - 1;
    return lastIndex < 0 ? 0 : this.chatMessages[lastIndex].timestamp;
  }

  // ObjectNode Lifecycle
  override onChildAdded(child: ObjectNode) {
    super.onChildAdded(child);
    if (child.parent === this && child instanceof ChatMessage && child.isDisplayable) {
      if (this.children.length === 1) {
        // ログデリート時
        this._unreadLength = 1;
        this._displayableMessageNum = 1;
      } else {
        this._unreadLength++;
        this._displayableMessageNum++;
      }

      if (child.to != null && child.to !== '') {
        // 秘話時に立ち絵の更新をかけない(処理なし)
      } else {
        // マウスクリック非表示を復帰する
        this.imageDispFlag[child.imagePos] = true;
      }

      emitMessageAdded({ tabIdentifier: this.identifier, messageIdentifier: child.identifier });
    }
  }

  addMessage(message: ChatMessageContext): ChatMessage {
    message.tabIdentifier = this.identifier;

    const chat = new ChatMessage();
    for (const key of Object.keys(message as Record<string, unknown>)) {
      if (key === 'identifier') continue;
      if (key === 'tabIdentifier') continue;

      if (key === 'text') {
        chat.value = (message as Record<string, unknown>)[key] as string;
        continue;
      }
      if ((message as Record<string, unknown>)[key] == null || (message as Record<string, unknown>)[key] === '')
        continue;

      if (key === 'imagePos') {
        if (message.to != null && message.to !== '') {
          continue;
        } // 秘話時に立絵の更新をかけない
        this.pos_num = (message as Record<string, unknown>)[key] as number;
        if (this.pos_num >= 0 && this.pos_num < this.imageIdentifier.length) {
          const oldpos = this.getImageCharactorPos(message.name ?? '');
          if (oldpos >= 0) {
            // 同名キャラの古い位置を消去
            this.imageIdentifier[oldpos] = '';
            this.imageCharacterName[oldpos] = '';
            this.imageDispFlag[oldpos] = false;
          }
          // 非表示コマンド\s

          if (message.imageIdentifier == '') {
            // 事前に古い立ち絵は消す処理をしているため処理なし
          } else {
            this.imageIdentifier[this.pos_num] = message.imageIdentifier ?? '';
            this.imageCharacterName[this.pos_num] = message.name ?? '';
            this.replacePortraitZIndex(this.pos_num);
            this.imageDispFlag[this.pos_num] = true;

            chat.setAttribute(key, (message as Record<string, unknown>)[key] as string | number);
          }
          this.imageIdentifierDummy = message.imageIdentifier ?? ''; // 同期方法が無理やり感がある、後日
        }
        continue;
      }

      chat.setAttribute(key, (message as Record<string, unknown>)[key] as string | number);
    }
    chat.initialize();

    if (!chat.tags.includes('secret')) {
      this.cutInLauncher?.chatActivateCutIn(chat.text, message.to ?? ''); // カットイン末尾発動
    }

    this.appendChild(chat);
    return chat;
  }

  markForRead() {
    this._unreadLength = 0;
  }

  override innerXml(): string {
    let xml = '';
    for (const child of this.children) {
      if (child instanceof ChatMessage && !child.isDisplayable) continue;
      xml += ObjectSerializer.instance.toXml(child);
    }
    return xml;
  }

  // ChatMessageに入れるか考えたがログ以外に使わないのでここにおく
  messageHtml(isTime: boolean, tabName: string, message: ChatMessage): string {
    return ChatLogExporter.formatMessageStandard(isTime, tabName, message);
  }

  messageHtmlCoc(tabName: string, message: ChatMessage): string {
    return ChatLogExporter.formatMessageCoc(tabName, message);
  }

  escapeHtml(value: unknown): string {
    return ChatLogExporter.escapeHtml(value);
  }

  logHtml(): string {
    return ChatLogExporter.exportTabHtml(this);
  }

  logHtmlCoc(): string {
    return ChatLogExporter.exportTabHtmlCoc(this);
  }
}
