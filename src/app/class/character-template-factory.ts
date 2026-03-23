import { ChatPalette } from './chat-palette';
import { DataElement, DataElementType } from './data-element';
import type { GameCharacter } from './game-character';

export class CharacterTemplateFactory {
  static createDefault(character: GameCharacter, name: string, size: number, imageIdentifier: string): void {
    character.createDataElements();

    const nameElement = DataElement.create('name', name, {}, `name_${character.identifier}`);
    const sizeElement = DataElement.create('size', size, {}, `size_${character.identifier}`);
    const altitudeElement = DataElement.create('altitude', 0, {}, `altitude_${character.identifier}`);

    if (character.imageDataElement.getFirstElementByName('imageIdentifier')) {
      character.imageDataElement.getFirstElementByName('imageIdentifier').value = imageIdentifier;
    }

    const resourceElement = DataElement.create('リソース', '', {}, `リソース${character.identifier}`);
    const hpElement = DataElement.create(
      'HP',
      200,
      { type: DataElementType.NUMBER_RESOURCE, currentValue: '200' },
      `HP_${character.identifier}`
    );
    const mpElement = DataElement.create(
      'MP',
      100,
      { type: DataElementType.NUMBER_RESOURCE, currentValue: '100' },
      `MP_${character.identifier}`
    );
    character.commonDataElement.appendChild(nameElement);
    character.commonDataElement.appendChild(sizeElement);
    character.commonDataElement.appendChild(altitudeElement);

    character.detailDataElement.appendChild(resourceElement);
    resourceElement.appendChild(hpElement);
    resourceElement.appendChild(mpElement);

    CharacterTemplateFactory.appendCommonDetailElements(character);
    CharacterTemplateFactory.appendChatPalette(character);
    character.addExtendData();
  }

  static createCheckTable(character: GameCharacter, name: string, size: number, imageIdentifier: string): void {
    character.createDataElements();

    const nameElement = DataElement.create('name', name, {}, `name_${character.identifier}`);
    const sizeElement = DataElement.create('size', size, {}, `size_${character.identifier}`);
    const altitudeElement = DataElement.create('altitude', 0, {}, `altitude_${character.identifier}`);

    if (character.imageDataElement.getFirstElementByName('imageIdentifier')) {
      character.imageDataElement.getFirstElementByName('imageIdentifier').value = imageIdentifier;
    }

    const resourceElement = DataElement.create('リソース', '', {}, `リソース${character.identifier}`);
    const hpElement = DataElement.create(
      'HP',
      200,
      { type: DataElementType.NUMBER_RESOURCE, currentValue: '200' },
      `HP_${character.identifier}`
    );
    const mpElement = DataElement.create(
      'MP',
      100,
      { type: DataElementType.NUMBER_RESOURCE, currentValue: '100' },
      `MP_${character.identifier}`
    );

    character.commonDataElement.appendChild(nameElement);
    character.commonDataElement.appendChild(sizeElement);
    character.commonDataElement.appendChild(altitudeElement);

    character.detailDataElement.appendChild(resourceElement);
    resourceElement.appendChild(hpElement);
    resourceElement.appendChild(mpElement);

    const infoElement = DataElement.create('情報', '', {}, `情報${character.identifier}`);
    character.detailDataElement.appendChild(infoElement);

    const textMarkDown = `テーブル表
|[]|[]器術|[]|[]体術|[]|[]忍術|[]|[]謀術|[]|[]戦術|[]|[]妖術||
|　|[]絡繰術|　|[]騎乗術|　|[]生存術|　|[]医術|　|[]兵糧術|　|[]異形化|2|
|　|[]火術|　|[]砲術|　|[]潜伏術|　|[]毒術|　|[]鳥獣術|　|[]召喚術|3|
|　|[]水術|　|[]手裏剣術|　|[]遁走術|　|[]罠術|　|[]野戦術|　|[]死霊術|4|
|　|[]針術|　|[]手練|　|[]盗聴術|　|[]調査術|　|[]地の利|　|[]結界術|5|
|　|[]仕込み|　|[]身体操術|　|[]腹話術|　|[]詐術|　|[]意気|　|[]封術|6|
|　|[]衣装術|　|[]歩法|　|[]隠形術|　|[]対人術|　|[]用兵術|　|[]言霊術|7|
|　|[]縄術|　|[]走法|　|[]変装術|　|[]遊芸|　|[]記憶術|　|[]幻術|8|
|　|[]登術|　|[]飛術|　|[]香術|　|[]九ノ一の術|　|[]見敵術|　|[]瞳術|9|
|　|[]拷問術|　|[]骨法術|　|[]分身の術|　|[]傀儡の術|　|[]暗号術|　|[]千里眼の術|10|
|　|[]壊器術|　|[]刀術|　|[]隠蔽術|　|[]流言の術|　|[]伝達術|　|[]憑依術|11|
|　|[]掘削術|　|[]怪力|　|[]第六感|　|[]経済力|　|[]人脈|　|[]呪術|12|
`;
    infoElement.appendChild(
      DataElement.create('忍術', textMarkDown, { type: DataElementType.MARKDOWN }, `忍術${character.identifier}`)
    );

    const textMarkDownNecro = `|損傷|使用|タイミング|コスト|射程|効果|
|[]こぶし|[]|アクション|2|0|肉弾攻撃1|
|[]うで|[]|ジャッジ|1|0|支援1|`;
    infoElement.appendChild(
      DataElement.create(
        'ネクロニカ的パーツ',
        textMarkDownNecro,
        { type: DataElementType.MARKDOWN },
        `ネクロニカ的パーツ${character.identifier}`
      )
    );
    infoElement.appendChild(
      DataElement.create(
        '宝物への依存',
        '[][][][] 幼児退行',
        { type: DataElementType.MARKDOWN },
        `ネクロニカ的未練${character.identifier}`
      )
    );

    character.overViewWidth = 800;
    character.overViewMaxHeight = 620;

    CharacterTemplateFactory.appendCommonDetailElements(character);
    CharacterTemplateFactory.appendChatPalette(character);
    character.addExtendData();
  }

  private static appendCommonDetailElements(character: GameCharacter): void {
    let testElement = DataElement.create('能力', '', {}, `能力${character.identifier}`);
    character.detailDataElement.appendChild(testElement);
    testElement.appendChild(DataElement.create('器用度', 24, {}, `器用度${character.identifier}`));
    testElement.appendChild(DataElement.create('敏捷度', 24, {}, `敏捷度${character.identifier}`));
    testElement.appendChild(DataElement.create('筋力', 24, {}, `筋力${character.identifier}`));
    testElement.appendChild(DataElement.create('生命力', 24, {}, `生命力${character.identifier}`));
    testElement.appendChild(DataElement.create('知力', 24, {}, `知力${character.identifier}`));
    testElement.appendChild(DataElement.create('精神力', 24, {}, `精神力${character.identifier}`));

    testElement = DataElement.create('戦闘特技', '', {}, `戦闘特技${character.identifier}`);
    character.detailDataElement.appendChild(testElement);
    testElement.appendChild(DataElement.create('Lv1', '全力攻撃', {}, `Lv1${character.identifier}`));
    testElement.appendChild(DataElement.create('Lv3', '武器習熟/ソード', {}, `Lv3${character.identifier}`));
    testElement.appendChild(DataElement.create('Lv5', '武器習熟/ソードⅡ', {}, `Lv5${character.identifier}`));
    testElement.appendChild(DataElement.create('Lv7', '頑強', {}, `Lv7${character.identifier}`));
    testElement.appendChild(DataElement.create('Lv9', '薙ぎ払い', {}, `Lv9${character.identifier}`));
    testElement.appendChild(DataElement.create('自動', '治癒適正', {}, `自動${character.identifier}`));
  }

  private static appendChatPalette(character: GameCharacter): void {
    const palette = new ChatPalette(`ChatPalette_${character.identifier}`);
    palette.setPalette(`チャットパレット入力例：
2d6+1 ダイスロール
１ｄ２０＋{敏捷}＋｛格闘｝　{name}の格闘！

自己バフ、リソース操作コマンド例：
&マッスルベアー/筋B+2/3
:MP-3
&マッスルベアー/筋B+2/3:MP-3

//敏捷=10+{敏捷A}
//敏捷A=10
//格闘＝１`);
    palette.initialize();
    character.appendChild(palette);
  }
}
