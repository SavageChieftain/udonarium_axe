import { TestBed } from '@angular/core/testing';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CardStack } from '@axe/domain/card/card-stack';
import { ImageTag } from '@axe/domain/media/image-tag';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TabletopActionService', () => {
  let service: TabletopActionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(TabletopActionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createDeckFromTag()', () => {
    const position = { x: 100, y: 120, z: 0 };
    const created: { destroy(): void }[] = [];

    function taggedImage(url: string, name: string, tag: string): string {
      const image = ImageStorage.instance.add(url);
      image.context.name = name;
      const imageTag = ImageTag.create(image.identifier);
      imageTag.tag = tag;
      created.push(imageTag);
      return image.identifier;
    }

    afterEach(() => {
      for (const object of created.splice(0)) object.destroy();
      for (const stack of ObjectStore.instance.getObjects<CardStack>(CardStack)) stack.destroy();
      for (const image of ImageStorage.instance.images) ImageStorage.instance.delete(image.identifier);
    });

    it('タグの画像 1 枚につきカード 1 枚の山札を作ること', () => {
      taggedImage('test://deck/dragon.png', 'ドラゴン.png', 'デッキA');
      taggedImage('test://deck/mage.png', '魔道士.png', 'デッキA');
      taggedImage('test://deck/other.png', 'よそのカード.png', 'デッキB');

      const stack = service.createDeckFromTag(position, 'デッキA', true);

      expect(stack).not.toBeNull();
      expect(stack!.cards).toHaveLength(2);
      expect(stack!.cards.map((card) => card.name).sort()).toEqual(['ドラゴン', '魔道士']);
      expect(stack!.name).toBe('デッキA');
    });

    it('画像名を使わない指定では既定のカード名になること', () => {
      taggedImage('test://deck/knight.png', '騎士.png', 'デッキC');

      const stack = service.createDeckFromTag(position, 'デッキC', false);

      expect(stack!.cards[0].name).not.toBe('騎士');
    });

    it('該当する画像が無ければ山札を作らないこと', () => {
      expect(service.createDeckFromTag(position, '空のタグ', true)).toBeNull();
    });
  });
});
