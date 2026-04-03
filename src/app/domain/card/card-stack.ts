import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { Card } from '@axe/domain/card/card';
import { DataElement } from '@axe/domain/data/data-element';
import { emitCardStackDecreased } from '@axe/domain/domain-events';
import { OwnedTabletopObject } from '@axe/domain/tabletop/owned-tabletop-object';
import { moveToTopmost } from '@axe/domain/tabletop/tabletop-object-util';

@SyncObject('card-stack')
export class CardStack extends OwnedTabletopObject {
  @SyncVar() isLock: boolean = false;

  @SyncVar() rotate: number = 0;
  @SyncVar() zindex: number = 0;
  @SyncVar() owner: string = '';
  @SyncVar() isShowTotal: boolean = true;

  @SyncVar() overViewWidth: number = 250;
  @SyncVar() overViewMaxHeight: number = 250;

  private get cardRoot(): ObjectNode | null {
    for (const node of this.children) {
      if (node.getAttribute('name') === 'cardRoot') return node;
    }
    return null;
  }
  get cards(): readonly Card[] {
    const cardRoot = this.cardRoot;
    return cardRoot ? (cardRoot.children as readonly Card[]) : [];
  }
  get topCard(): Card | null {
    return this.isEmpty ? null : this.cards[0];
  }
  get isEmpty(): boolean {
    return this.cards.length < 1;
  }
  override get imageFile(): ImageFile {
    return this.topCard?.imageFile ?? ImageFile.Empty;
  }

  // ObjectNode Lifecycle
  override onChildRemoved(child: ObjectNode) {
    super.onChildRemoved(child);
    if (child instanceof Card) {
      emitCardStackDecreased({
        cardStackIdentifier: this.identifier,
        cardIdentifier: child.identifier,
      });
    }
  }

  shuffle(): readonly Card[] {
    const cardRoot = this.cardRoot;
    if (!cardRoot) return [];
    const length = cardRoot.children.length;
    for (const card of this.cards) {
      card.index = Math.random() * length;
      card.rotate = Math.floor(Math.random() * 2) * 180;
      this.setSamePositionFor(card);
    }
    return this.cards;
  }

  drawCard(): Card | null {
    const topCard = this.topCard;
    const cardRoot = this.cardRoot;
    const card = topCard && cardRoot ? cardRoot.removeChild(topCard) : null;
    if (card) {
      card.rotate += this.rotate;
      if (card.rotate > 360) card.rotate -= 360;
      this.setSamePositionFor(card);
      card.toTopmost();
    }
    return card;
  }

  drawCardAll(): Card[] {
    const cardRoot = this.cardRoot;
    const cards = [...this.cards];
    for (const card of cards) {
      cardRoot?.removeChild(card);
      card.rotate += this.rotate;
      this.setSamePositionFor(card);
      if (card.rotate > 360) card.rotate -= 360;
    }
    return cards;
  }

  faceUp() {
    const topCard = this.topCard;
    if (topCard) {
      topCard.faceUp();
      this.setSamePositionFor(topCard);
    }
  }

  faceDown() {
    const topCard = this.topCard;
    if (topCard) {
      topCard.faceDown();
      this.setSamePositionFor(topCard);
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

  putOnTop(card: Card): Card | null {
    const cardRoot = this.cardRoot;
    if (!cardRoot) return null;
    const topCard = this.topCard;
    if (!topCard) return this.putOnBottom(card);
    card.owner = '';
    card.zindex = 0;
    let delta = Math.abs(card.rotate - this.rotate);
    if (delta > 180) delta = 360 - delta;
    card.rotate = delta <= 90 ? 0 : 180;
    this.setSamePositionFor(card);
    return cardRoot.insertBefore(card, topCard);
  }

  putOnBottom(card: Card): Card | null {
    const cardRoot = this.cardRoot;
    if (!cardRoot) return null;
    card.owner = '';
    card.zindex = 0;
    let delta = Math.abs(card.rotate - this.rotate);
    if (delta > 180) delta = 360 - delta;
    card.rotate = delta <= 90 ? 0 : 180;
    this.setSamePositionFor(card);
    return cardRoot.appendChild(card);
  }

  toTopmost() {
    moveToTopmost(this, ['card']);
  }

  override setLocation(location: string) {
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
    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    const cardRoot = new ObjectNode(`cardRoot_${object.identifier}`);
    cardRoot.setAttribute('name', 'cardRoot');
    cardRoot.initialize();
    object.appendChild(cardRoot);
    object.initialize();

    return object;
  }
}
