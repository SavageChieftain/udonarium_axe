import { ObjectStore } from '@axe/core/sync/object-store';
import { CharacterTemplateFactory } from '@axe/domain/character/character-template-factory';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElementType } from '@axe/domain/data/data-element';

describe('CharacterTemplateFactory', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = ObjectStore.instance;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('createDefault', () => {
    it('キャラクターにname/size/altitudeが設定される', () => {
      const character = GameCharacter.create('テスト勇者', 2, '');

      expect(character.name).toBe('テスト勇者');
      expect(character.size).toBe(2);
      const altitude = character.commonDataElement!.getFirstElementByName('altitude');
      expect(altitude).toBeTruthy();
      expect(altitude!.value).toBe(0);
    });

    it('HP/MPリソースが作成される', () => {
      const character = GameCharacter.create('戦士', 1, '');

      const hp = character.detailDataElement!.getFirstElementByName('HP');
      expect(hp).toBeTruthy();
      expect(hp!.value).toBe(200);
      expect(hp!.currentValue).toBe('200');
      expect(hp!.type).toBe(DataElementType.NUMBER_RESOURCE);

      const mp = character.detailDataElement!.getFirstElementByName('MP');
      expect(mp).toBeTruthy();
      expect(mp!.value).toBe(100);
      expect(mp!.currentValue).toBe('100');
    });

    it('能力値が作成される', () => {
      const character = GameCharacter.create('魔法使い', 1, '');

      const dex = character.detailDataElement!.getFirstElementByName('器用度');
      expect(dex).toBeTruthy();
      expect(dex!.value).toBe(24);

      const int = character.detailDataElement!.getFirstElementByName('知力');
      expect(int).toBeTruthy();
      expect(int!.value).toBe(24);
    });

    it('戦闘特技が作成される', () => {
      const character = GameCharacter.create('剣士', 1, '');

      const lv1 = character.detailDataElement!.getFirstElementByName('Lv1');
      expect(lv1).toBeTruthy();
      expect(lv1!.value).toBe('全力攻撃');
    });

    it('chatPaletteが作成される', () => {
      const character = GameCharacter.create('盗賊', 1, '');

      const palette = character.chatPalette;
      expect(palette).toBeTruthy();
    });
  });

  describe('createCheckTable', () => {
    it('マークダウン形式の忍術テーブルが作成される', () => {
      const character = new GameCharacter();
      character.createDataElements();
      character.initialize();
      CharacterTemplateFactory.createCheckTable(character, '忍者', 1, '');

      const ninjutsu = character.detailDataElement!.getFirstElementByName('忍術');
      expect(ninjutsu).toBeTruthy();
      expect(ninjutsu!.type).toBe(DataElementType.MARKDOWN);
      expect(ninjutsu!.value).toContain('テーブル表');
    });

    it('ネクロニカ的パーツが作成される', () => {
      const character = new GameCharacter();
      character.createDataElements();
      character.initialize();
      CharacterTemplateFactory.createCheckTable(character, '人形', 1, '');

      const parts = character.detailDataElement!.getFirstElementByName('ネクロニカ的パーツ');
      expect(parts).toBeTruthy();
      expect(parts!.type).toBe(DataElementType.MARKDOWN);
    });

    it('overViewWidthとoverViewMaxHeightがカスタム値に設定される', () => {
      const character = new GameCharacter();
      character.createDataElements();
      character.initialize();
      CharacterTemplateFactory.createCheckTable(character, 'テスト', 1, '');

      expect(character.overViewWidth).toBe(800);
      expect(character.overViewMaxHeight).toBe(620);
    });
  });
});
