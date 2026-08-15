import { ImageStorage } from '@axe/core/storage/image-storage';
import { Coin } from '@axe/domain/coin/coin';

describe('Coin', () => {
  const created: { destroy(): void }[] = [];

  function makeCoin(): Coin {
    const coin = Coin.create('コイン');
    created.push(coin);
    return coin;
  }

  afterEach(() => {
    for (const object of created.splice(0)) object.destroy();
    for (const image of ImageStorage.instance.images) ImageStorage.instance.delete(image.identifier);
  });

  it('is created face up', () => {
    const coin = makeCoin();

    expect(coin.face).toBe('front');
    expect(coin.isFront).toBe(true);
    expect(coin.size).toBe(1);
  });

  it('lands on one face or the other by the toss', () => {
    const coin = makeCoin();

    expect(coin.flip(() => 0.49)).toBe('front');
    expect(coin.face).toBe('front');
    expect(coin.flip(() => 0.5)).toBe('back');
    expect(coin.face).toBe('back');
  });

  it('comes up either way over enough tosses', () => {
    const coin = makeCoin();
    const faces = new Set(Array.from({ length: 200 }, () => coin.flip()));

    expect([...faces].sort()).toEqual(['back', 'front']);
  });

  it('returns the picture of the face that is up', () => {
    const coin = makeCoin();
    const front = ImageStorage.instance.add('test://coin/front.png');
    const back = ImageStorage.instance.add('test://coin/back.png');
    coin.imageDataElement!.getFirstElementByName('front')!.value = front.identifier;
    coin.imageDataElement!.getFirstElementByName('back')!.value = back.identifier;

    expect(coin.imageFile.identifier).toBe(front.identifier);
    coin.flip(() => 0.9);
    expect(coin.imageFile.identifier).toBe(back.identifier);
  });

  it('returns an empty picture when there is none', () => {
    expect(makeCoin().imageFile.url).toBe('');
  });
});
