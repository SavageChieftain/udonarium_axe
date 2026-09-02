import { getPeerContext } from '@axe/core/network/peer-context-source';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { Attributes } from '@axe/core/sync/attributes';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { OUT_OF_STORY_TAG } from '@axe/domain/chat/constants';
import { type DiceRollDetail, parseDiceRollDetail } from '@axe/domain/dice/dice-roll-detail';
import { VN_PORTRAIT_POS_UNSET } from '@axe/domain/visual-novel/vn-portrait-position';

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
  messBubbleLight?: string;
  messBubbleDark?: string;
  sendFrom?: string;
  replyTo?: string;
  quoteOf?: string;
  vnEmote?: string;
  senderRole?: string;
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
  @SyncVar() vnPortraitPos: number = VN_PORTRAIT_POS_UNSET;
  /**
   * How novel mode is asked to stage this line, read by `vnEmoteOf`.
   *
   * Deliberately left without an initialiser: class fields are assigned rather than defined
   * here, so giving one would write the attribute onto every message ever said, novel mode or
   * not. Unset reads back as an empty string, which is what an absent staging means anyway.
   */
  @SyncVar() vnEmote: string;
  /**
   * What the person speaking was when they said it.
   *
   * A role is worn now and taken off later, and the cursor that carried it is built afresh on
   * every connection, so neither can answer for a line already said. Recorded here so that a
   * reading of the log settles what it is once and keeps that answer.
   *
   * Left without an initialiser, as `vnEmote` is: a line from a room that never wrote one has
   * nothing to say about its speaker, and reads back empty.
   */
  @SyncVar() senderRole: string;
  @SyncVar() messColor: string;
  /** The bubble the sender asked for on each theme. Empty is worked out from the colour. */
  @SyncVar() messBubbleLight: string = '';
  @SyncVar() messBubbleDark: string = '';
  @SyncVar() sendFrom: string;
  @SyncVar() replyTo: string = '';
  @SyncVar() quoteOf: string = '';
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
  get replyToMessage(): ChatMessage | null {
    if (!this.replyTo) return null;
    const target = ObjectStore.instance.get<ChatMessage>(this.replyTo);
    return target instanceof ChatMessage ? target : null;
  }
  get quoteOfMessage(): ChatMessage | null {
    if (!this.quoteOf) return null;
    const target = ObjectStore.instance.get<ChatMessage>(this.quoteOf);
    return target instanceof ChatMessage ? target : null;
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

  // The reply and the quotation hold the identifier of the message they refer to as text.
  // The base class does not write that identifier out, so every save and load would mint a
  // new one and break the reference. This class writes it out and reads it back as an
  // attribute, so the relationship survives.
  override toAttributes(): Attributes {
    const attrs: Attributes = { ...ObjectSerializer.toAttributes(this.attributes as Attributes) };
    attrs['identifier'] = this.identifier;
    return attrs;
  }

  override parseAttributes(attributes: NamedNodeMap): void {
    ObjectSerializer.parseAttributes(this.attributes, attributes);
    const persistedId = this.attributes['identifier'];
    if (typeof persistedId === 'string' && persistedId.length > 0) {
      (this as unknown as { context: { identifier: string } }).context.identifier = persistedId;
      // it is removed from the attributes, the context being the one place it belongs
      delete (this.attributes as Record<string, unknown>)['identifier'];
    }
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

  /** What was rolled and whether it succeeded. Anything rolled before this was recorded has neither. */
  get rollDetail(): DiceRollDetail | null {
    return parseDiceRollDetail(this.dicebot);
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
  get isSystemMessage(): boolean {
    return this.from === 'System' || (this.tag ?? '').includes('system-message');
  }
  /** Whether novel mode should pass this line over rather than have it read out. */
  get isOutOfStory(): boolean {
    return this.tags.includes(OUT_OF_STORY_TAG);
  }

  get changeable(): boolean {
    return this.isChangeableBy(getPeerContext().userId);
  }
  isChangeableBy(userId: string): boolean {
    if (this.isSystemMessage) return false;
    return userId === this.from;
  }
}
