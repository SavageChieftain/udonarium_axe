import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { Card } from '@axe/domain/card/card';
import { DataElement } from '@axe/domain/data/data-element';
import { emitCardStackDecreased } from '@axe/domain/domain-events';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { moveToTopmost } from '@axe/domain/tabletop/tabletop-object-util';

@SyncObject('card-stack')
export class CardStack extends TabletopObject {
  override get aliasName(): 'card-stack' {
    return 'card-stack';
  }
  @SyncVar() isLock: boolean = false;

  @SyncVar() rotate: number = 0;
  @SyncVar() zindex: number = 0;
  @SyncVar() owner: string = '';
  @SyncVar() isShowTotal: boolean = true;

  @SyncVar() overViewWidth: number = 250;
  @SyncVar() overViewMaxHeight: number = 250;

  get name(): string {
    return this.getCommonValue('name', '');
  }
  get ownerName(): string {
    const object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }
  get hasOwner(): boolean {
    return this.owner.length > 0;
  }

  private get cardRoot(): ObjectNode {
    for (const node of this.children) {
      if (node.getAttribute('name') === 'cardRoot') return node;
    }
    return null!;
  }
  get cards(): Card[] {
    return this.cardRoot ? <Card[]>this.cardRoot.children : [];
  }
  get topCard(): Card {
    return this.isEmpty ? null! : this.cards[0];
  }
  get isEmpty(): boolean {
    return this.cards.length < 1;
  }
  get imageFile(): ImageFile {
    return this.topCard ? this.topCard.imageFile : null!;
  }

  // ObjectNode Lifecycle
  onChildRemoved(child: ObjectNode) {
    super.onChildRemoved(child);
    if (child instanceof Card) {
      emitCardStackDecreased({
        cardStackIdentifier: this.identifier,
        cardIdentifier: child.identifier,
      });
    }
  }

  shuffle(): Card[] {
    if (!this.cardRoot) return [];
    const length = this.cardRoot.children.length;
    for (const card of this.cards) {
      card.index = Math.random() * length;
      card.rotate = Math.floor(Math.random() * 2) * 180;
      this.setSamePositionFor(card);
    }
    return this.cards;
  }

  drawCard(): Card {
    const card = this.topCard ? this.cardRoot.removeChild(this.topCard) : null!;
    if (card) {
      card.rotate += this.rotate;
      if (card.rotate > 360) card.rotate -= 360;
      this.setSamePositionFor(card);
      card.toTopmost();
    }
    return card;
  }

  drawCardAll(): Card[] {
    const cards = this.cards;
    for (const card of cards) {
      this.cardRoot.removeChild(card);
      card.rotate += this.rotate;
      this.setSamePositionFor(card);
      if (card.rotate > 360) card.rotate -= 360;
    }
    return cards;
  }

  faceUp() {
    if (this.topCard) {
      this.topCard.faceUp();
      this.setSamePositionFor(this.topCard);
    }
  }

  faceDown() {
    if (this.topCard) {
      this.topCard.faceDown();
      this.setSamePositionFor(this.topCard);
    }
  }

  faceUpAll() {
    for (const card of this.cards) {
      card.faceUp();
      this.setSamePositionFor(card);
    }
  }

  faceDownAll() {
    for (const card of this.cards) {
      card.faceDown();
      this.setSamePositionFor(card);
    }
  }

  uprightAll() {
    for (const card of this.cards) {
      card.rotate = 0;
      this.setSamePositionFor(card);
    }
  }

  unifyCardsSize(size: number): void {
    for (const card of this.cards) {
      if (card.size !== size) card.size = size;
    }
  }

  putOnTop(card: Card): Card {
    if (!this.cardRoot) return null!;
    if (!this.topCard) return this.putOnBottom(card);
    card.owner = '';
    card.zindex = 0;
    let delta = Math.abs(card.rotate - this.rotate);
    if (delta > 180) delta = 360 - delta;
    card.rotate = delta <= 90 ? 0 : 180;
    this.setSamePositionFor(card);
    return this.cardRoot.insertBefore(card, this.topCard);
  }

  putOnBottom(card: Card): Card {
    if (!this.cardRoot) return null!;
    card.owner = '';
    card.zindex = 0;
    let delta = Math.abs(card.rotate - this.rotate);
    if (delta > 180) delta = 360 - delta;
    card.rotate = delta <= 90 ? 0 : 180;
    this.setSamePositionFor(card);
    return this.cardRoot.appendChild(card);
  }

  toTopmost() {
    moveToTopmost(this, ['card']);
  }

  // override
  setLocation(location: string) {
    super.setLocation(location);
    const cards = this.cards;
    for (const card of cards) card.setLocation(location);
  }

  private setSamePositionFor(card: Card) {
    card.location.name = this.location.name;
    card.location.x = this.location.x;
    card.location.y = this.location.y;
    card.posZ = this.posZ;
  }

  static create(name: string, identifier?: string): CardStack {
    let object: CardStack;

    if (identifier) {
      object = new CardStack(identifier);
    } else {
      object = new CardStack();
    }
    object.createDataElements();
    object.commonDataElement.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    const cardRoot = new ObjectNode(`cardRoot_${object.identifier}`);
    cardRoot.setAttribute('name', 'cardRoot');
    cardRoot.initialize();
    object.appendChild(cardRoot);
    object.initialize();

    return object;
  }
}
