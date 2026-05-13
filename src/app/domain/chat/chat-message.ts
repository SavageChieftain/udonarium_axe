import { getPeerContext } from '@axe/core/network/peer-context-source';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';

export interface ChatMessageTargetContext {
  text: string;
  object: GameCharacter | null;
}

export interface ChatMessageContext {
  identifier?: string;
  tabIdentifier?: string;
  originFrom?: string;
  from?: string;
  to?: string;
  name?: string;
  text?: string;
  timestamp?: number;
  tag?: string;
  dicebot?: string;
  imageIdentifier?: string;
  attachmentImageIdentifiers?: string;

  imagePos?: number;
  messColor?: string;
  sendFrom?: string;
}

@SyncObject('chat')
export class ChatMessage extends ObjectNode implements ChatMessageContext {
  @SyncVar() originFrom: string;
  @SyncVar() from: string;
  @SyncVar() to: string;
  @SyncVar() name: string;
  @SyncVar() tag: string;
  @SyncVar() dicebot: string;
  @SyncVar() imageIdentifier: string;
  @SyncVar() attachmentImageIdentifiers: string = '';
  @SyncVar() imagePos: number;
  @SyncVar() messColor: string;
  @SyncVar() sendFrom: string;
  @SyncVar() fixd: boolean = false;

  targetInfo: ChatMessageTargetContext[];

  get tabIdentifier(): string {
    return this.parent?.identifier ?? '';
  }
  get text(): string {
    return this.value as string;
  }
  set text(text: string) {
    this.value = text;
  }

  get timestamp(): number {
    const timestamp = this.getAttribute('timestamp');
    const num = timestamp ? +timestamp : 0;
    return Number.isNaN(num) ? 1 : num;
  }
  private _to!: string;
  private _sendTo: string[] = [];
  get sendTo(): string[] {
    if (this._to !== this.to) {
      this._to = this.to;
      this._sendTo = this.to != null && this.to.trim().length > 0 ? this.to.trim().split(/\s+/) : [];
    }
    return this._sendTo;
  }
  private _tag!: string;
  private _tags: string[] = [];
  get tags(): string[] {
    if (this._tag !== this.tag) {
      this._tag = this.tag;
      this._tags = this.tag != null && this.tag.trim().length > 0 ? this.tag.trim().split(/\s+/) : [];
    }
    return this._tags;
  }
  get image(): ImageFile | null {
    return ImageStorage.instance.get(this.imageIdentifier);
  }
  get attachmentImageIdentifierList(): string[] {
    const rawValue = String(this.attachmentImageIdentifiers ?? '').trim();
    if (rawValue.startsWith('[')) {
      try {
        const identifiers = JSON.parse(rawValue) as unknown;
        if (Array.isArray(identifiers)) {
          return identifiers
            .map((identifier) => String(identifier).trim())
            .filter((identifier) => identifier.length > 0);
        }
      } catch {
        return [];
      }
    }
    return rawValue
      .split(/\n+/)
      .map((identifier) => identifier.trim())
      .filter((identifier) => identifier.length > 0);
  }
  get attachmentImages(): ImageFile[] {
    return this.attachmentImageIdentifierList
      .map((identifier) => ImageStorage.instance.get(identifier))
      .filter((image): image is ImageFile => image != null);
  }
  override get index(): number {
    return this.minorIndex + this.timestamp;
  }
  get isDirect(): boolean {
    return this.sendTo.length > 0;
  }
  get isSendFromSelf(): boolean {
    return this.isSentBy(getPeerContext().userId);
  }
  isSentBy(userId: string): boolean {
    return this.from === userId || this.originFrom === userId;
  }
  get isRelatedToMe(): boolean {
    return this.isRelatedTo(getPeerContext().userId);
  }
  isRelatedTo(userId: string): boolean {
    return this.sendTo.includes(userId) || this.isSentBy(userId);
  }
  get isDisplayable(): boolean {
    return this.isDirect ? this.isRelatedToMe : true;
  }
  isDisplayableTo(userId: string): boolean {
    return this.isDirect ? this.isRelatedTo(userId) : true;
  }
  get isSystem(): boolean {
    return this.tags.includes('system');
  }
  get isDicebot(): boolean {
    return this.isSystem && this.from === 'System-BCDice';
  }
  get isSecret(): boolean {
    return this.tags.includes('secret');
  }
  get chatTabList(): ChatTabList {
    return ObjectStore.instance.get<ChatTabList>('ChatTabList')!;
  }

  get isSystemToPL(): boolean {
    return this.tags.includes('to-pl-system-message');
  }
  get changeable(): boolean {
    return this.isChangeableBy(getPeerContext().userId);
  }
  isChangeableBy(userId: string): boolean {
    return userId === this.from && this.name !== 'システムメッセージ';
  }
}
