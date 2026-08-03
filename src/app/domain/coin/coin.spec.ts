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

  it('表向きで作られること', () => {
    const coin = makeCoin();

    expect(coin.face).toBe('front');
    expect(coin.isFront).toBe(true);
    expect(coin.size).toBe(1);
  });

  it('乱数が 0.5 未満なら表、以上なら裏になること', () => {
    const coin = makeCoin();

    expect(coin.flip(() => 0.49)).toBe('front');
    expect(coin.face).toBe('front');
    expect(coin.flip(() => 0.5)).toBe('back');
    expect(coin.face).toBe('back');
  });

  it('両方の面が出ること', () => {
    const coin = makeCoin();
    const faces = new Set(Array.from({ length: 200 }, () => coin.flip()));

    expect([...faces].sort()).toEqual(['back', 'front']);
  });

  it('向いている面の画像を返すこと', () => {
    const coin = makeCoin();
    const front = ImageStorage.instance.add('test://coin/front.png');
    const back = ImageStorage.instance.add('test://coin/back.png');
    coin.imageDataElement!.getFirstElementByName('front')!.value = front.identifier;
    coin.imageDataElement!.getFirstElementByName('back')!.value = back.identifier;

    expect(coin.imageFile.identifier).toBe(front.identifier);
    coin.flip(() => 0.9);
    expect(coin.imageFile.identifier).toBe(back.identifier);
  });

  it('画像が無ければ空の画像を返すこと', () => {
    expect(makeCoin().imageFile.url).toBe('');
  });
});
