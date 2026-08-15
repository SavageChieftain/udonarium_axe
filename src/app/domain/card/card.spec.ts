import { TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { IPeerContext } from '@axe/core/network/peer-context';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card, CardState } from '@axe/domain/card/card';

describe('Card', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    // Clear any existing objects from previous tests
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    // Cleanup after each test
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a card with name, images, and size', () => {
      const card = Card.create('Test Card', 'front.png', 'back.png', 2);

      expect(card).toBeTruthy();
      expect(card.name).toBe('Test Card');
      expect(card.size).toBe(2);
    });

    it('should create card with default size of 2', () => {
      const card = Card.create('Test', 'front.png', 'back.png');

      expect(card.size).toBe(2);
    });

    it('should create card with custom identifier', () => {
      const card = Card.create('Test', 'front.png', 'back.png', 2, 'custom-id');

      expect(card.identifier).toBe('custom-id');
    });

    it('should add card to object store', () => {
      const card = Card.create('Test', 'front.png', 'back.png');

      expect(store.get(card.identifier)).toBe(card);
    });

    it('should create front and back image data elements', () => {
      const card = Card.create('Test', 'front.png', 'back.png');

      const frontElement = card.imageDataElement!.getFirstElementByName('front');
      const backElement = card.imageDataElement!.getFirstElementByName('back');

      expect(frontElement).toBeTruthy();
      expect(backElement).toBeTruthy();
      expect(frontElement!.value).toBe('front.png');
      expect(backElement!.value).toBe('back.png');
    });
  });

  describe('aliasName', () => {
    it('should return "card"', () => {
      const card = new Card();
      expect(card.aliasName).toBe('card');
    });
  });

  describe('state management', () => {
    it('should initialize with FRONT state', () => {
      const card = new Card();
      expect(card.state).toBe(CardState.FRONT);
    });

    it('should have isFront true when state is FRONT', () => {
      const card = new Card();
      card.state = CardState.FRONT;

      expect(card.isFront).toBe(true);
    });

    it('should have isFront false when state is BACK', () => {
      const card = new Card();
      card.state = CardState.BACK;

      expect(card.isFront).toBe(false);
    });

    it('should change state with faceUp()', () => {
      const card = new Card();
      card.state = CardState.BACK;
      card.owner = 'user123';

      card.faceUp();

      expect(card.state).toBe(CardState.FRONT);
      expect(card.owner).toBe('');
    });

    it('should change state with faceDown()', () => {
      const card = new Card();
      card.state = CardState.FRONT;
      card.owner = 'user123';

      card.faceDown();

      expect(card.state).toBe(CardState.BACK);
      expect(card.owner).toBe('');
    });

    it('should clear owner when facing up', () => {
      const card = Card.create('Test', 'front.png', 'back.png');
      card.owner = 'user123';

      card.faceUp();

      expect(card.owner).toBe('');
      expect(card.hasOwner).toBe(false);
    });

    it('should clear owner when facing down', () => {
      const card = Card.create('Test', 'front.png', 'back.png');
      card.owner = 'user123';

      card.faceDown();

      expect(card.owner).toBe('');
      expect(card.hasOwner).toBe(false);
    });
  });

  describe('lock functionality', () => {
    it('should initialize with isLock false', () => {
      const card = new Card();
      expect(card.isLock).toBe(false);
    });

    it('should allow setting isLock', () => {
      const card = new Card();
      card.isLock = true;

      expect(card.isLock).toBe(true);
    });

    it('should initialize with dispLockMark true', () => {
      const card = new Card();
      expect(card.dispLockMark).toBe(true);
    });

    it('should allow hiding lock mark', () => {
      const card = new Card();
      card.dispLockMark = false;

      expect(card.dispLockMark).toBe(false);
    });
  });

  describe('owner management', () => {
    it('should initialize without owner', () => {
      const card = new Card();
      expect(card.owner).toBe('');
      expect(card.hasOwner).toBe(false);
    });

    it('should detect when card has owner', () => {
      const card = new Card();
      card.owner = 'user123';

      expect(card.hasOwner).toBe(true);
    });

    it('should return empty ownerName when no owner', () => {
      const card = new Card();

      expect(card.ownerName).toBe('');
    });

    it('should detect owner online status when owner exists', () => {
      const card = new Card();
      card.owner = 'user123';

      vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([{ userId: 'user123', isOpen: true } as IPeerContext]);

      expect(card.ownerIsOnline).toBe(true);
    });

    it('should detect owner offline status', () => {
      const card = new Card();
      card.owner = 'user123';

      vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue([{ userId: 'user123', isOpen: false } as IPeerContext]);

      expect(card.ownerIsOnline).toBe(false);
    });

    it('should return false for ownerIsOnline when no owner', () => {
      const card = new Card();

      expect(card.ownerIsOnline).toBe(false);
    });

    it('should detect if card is in current user hand', () => {
      const card = new Card();
      const mockUserId = 'current-user';

      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: mockUserId } as IPeerContext);
      card.owner = mockUserId;

      expect(card.isPeeking).toBe(true);
    });

    it('should return false for isPeeking when owned by different user', () => {
      const card = new Card();

      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'user1' } as IPeerContext);
      card.owner = 'user2';

      expect(card.isPeeking).toBe(false);
    });
  });

  describe('hand', () => {
    it('moves a card into a hand face down, and out of its owners keeping', () => {
      const card = new Card();
      card.state = CardState.FRONT;
      card.owner = 'me';

      card.toHand('me');

      expect(card.location.name).toBe('hand:me');
      expect(card.state).toBe(CardState.BACK);
      expect(card.owner).toBe('');
    });

    it('puts a card played face up back on the table', () => {
      const card = new Card();
      card.toHand('me');

      card.playFaceUp();

      expect(card.location.name).toBe('table');
      expect(card.state).toBe(CardState.FRONT);
      expect(card.isInAnyHand).toBe(false);
    });

    it('puts one played face down back still hidden', () => {
      const card = new Card();
      card.toHand('me');

      card.playFaceDown();

      expect(card.location.name).toBe('table');
      expect(card.state).toBe(CardState.BACK);
      expect(card.owner).toBe('');
    });

    it('leaves it where it was before it went into the hand', () => {
      const card = new Card();
      card.location.x = 320;
      card.location.y = 240;

      card.toHand('me');
      card.playFaceUp();

      expect(card.location.x).toBe(320);
      expect(card.location.y).toBe(240);
    });
  });

  describe('visibility', () => {
    it('should be visible when in hand', () => {
      const card = new Card();

      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'user1' } as IPeerContext);
      card.owner = 'user1';

      expect(card.isVisible).toBe(true);
    });

    it('should be visible when face up', () => {
      const card = new Card();
      card.state = CardState.FRONT;

      expect(card.isVisible).toBe(true);
    });

    it('a card in your own hand can be seen', () => {
      const card = new Card();
      card.state = CardState.BACK;

      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'me' } as IPeerContext);
      card.toHand('me');

      expect(card.isInMyHand).toBe(true);
      expect(card.isVisible).toBe(true);
    });

    it('one in somebody elses cannot', () => {
      const card = new Card();

      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'me' } as IPeerContext);
      card.toHand('other');

      expect(card.isInMyHand).toBe(false);
      expect(card.isInAnyHand).toBe(true);
      expect(card.isVisible).toBe(false);
    });

    it('should not be visible when face down and not in hand', () => {
      const card = new Card();
      card.state = CardState.BACK;
      card.owner = '';

      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'someone' } as IPeerContext);
      expect(card.isVisible).toBe(false);
    });

    it('should use front image when visible', () => {
      const card = Card.create('Test', 'front.png', 'back.png');
      card.state = CardState.FRONT;

      const image = card.imageFile;
      expect(image).toBe(card.frontImage ?? ImageFile.Empty);
    });

    it('should use back image when not visible', () => {
      const card = Card.create('Test', 'front.png', 'back.png');
      card.state = CardState.BACK;
      card.owner = '';

      const image = card.imageFile;
      expect(image).toBe(card.backImage ?? ImageFile.Empty);
    });
  });

  describe('rotation and z-index', () => {
    it('should initialize with rotate 0', () => {
      const card = new Card();
      expect(card.rotate).toBe(0);
    });

    it('should allow setting rotation', () => {
      const card = new Card();
      card.rotate = 90;

      expect(card.rotate).toBe(90);
    });

    it('should initialize with zindex 0', () => {
      const card = new Card();
      expect(card.zindex).toBe(0);
    });

    it('should allow setting z-index', () => {
      const card = new Card();
      card.zindex = 5;

      expect(card.zindex).toBe(5);
    });
  });

  describe('size management', () => {
    it('should allow changing size', () => {
      const card = Card.create('Test', 'front.png', 'back.png', 2);

      card.size = 3;

      expect(card.size).toBe(3);
    });

    it('should get size from common data', () => {
      const card = Card.create('Test', 'front.png', 'back.png', 4);

      expect(card.size).toBe(4);
    });
  });

  describe('overview dimensions', () => {
    it('should have default overViewWidth of 250', () => {
      const card = new Card();
      expect(card.overViewWidth).toBe(250);
    });

    it('should allow setting overViewWidth', () => {
      const card = new Card();
      card.overViewWidth = 300;

      expect(card.overViewWidth).toBe(300);
    });

    it('should have default overViewMaxHeight of 250', () => {
      const card = new Card();
      expect(card.overViewMaxHeight).toBe(250);
    });

    it('should allow setting overViewMaxHeight', () => {
      const card = new Card();
      card.overViewMaxHeight = 400;

      expect(card.overViewMaxHeight).toBe(400);
    });
  });

  describe('table visibility', () => {
    it('should detect when on table without parent', () => {
      const card = Card.create('Test', 'front.png', 'back.png');
      card.setLocation('table');

      expect(card.isVisibleOnTable).toBe(true);
    });

    it('should not be visible on table when in different location', () => {
      const card = Card.create('Test', 'front.png', 'back.png');
      card.setLocation('graveyard');

      expect(card.isVisibleOnTable).toBe(false);
    });
  });

  describe('CardState enum', () => {
    it('should have FRONT state', () => {
      expect(CardState.FRONT).toBeDefined();
    });

    it('should have BACK state', () => {
      expect(CardState.BACK).toBeDefined();
    });

    it('should have distinct values', () => {
      expect(CardState.FRONT).not.toBe(CardState.BACK);
    });
  });

  describe('isOwnedBy', () => {
    it('is true for the owner', () => {
      const card = new Card();
      card.owner = 'user-A';
      expect(card.isOwnedBy('user-A')).toBe(true);
    });

    it('is false for anybody else', () => {
      const card = new Card();
      card.owner = 'user-A';
      expect(card.isOwnedBy('user-B')).toBe(false);
    });
  });

  describe('isOwnerOnline', () => {
    it('is true while the owner is here', () => {
      const card = new Card();
      card.owner = 'user-A';
      const contexts = [{ userId: 'user-A', isOpen: true }];
      expect(card.isOwnerOnline(contexts)).toBe(true);
    });

    it('is false once they are gone', () => {
      const card = new Card();
      card.owner = 'user-A';
      const contexts = [{ userId: 'user-A', isOpen: false }];
      expect(card.isOwnerOnline(contexts)).toBe(false);
    });

    it('is false for an owner nobody has seen', () => {
      const card = new Card();
      card.owner = 'user-A';
      const contexts: { userId: string; isOpen: boolean }[] = [];
      expect(card.isOwnerOnline(contexts)).toBe(false);
    });
  });
});
