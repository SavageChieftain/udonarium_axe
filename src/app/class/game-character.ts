import { generateUuid } from '@axe/core/system/util/uuid';

import { BuffPalette, ChatPalette } from './chat-palette';
import { ImageFile } from './core/file-storage/image-file';
import { ImageStorage } from './core/file-storage/image-storage';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
//import { GameObjectInventoryService } from 'service/game-object-inventory.service';
import { ObjectStore } from './core/synchronize-object/object-store';
import { DataElement } from './data-element';
import { TabletopObject } from './tabletop-object';

@SyncObject('character')
export class GameCharacter extends TabletopObject {
  override get aliasName(): 'character' {
    return 'character';
  }
  constructor(identifier: string = generateUuid()) {
    super(identifier);
    this.isAltitudeIndicate = true;
  }

  @SyncVar() isLock: boolean = false;

  @SyncVar() rotate: number = 0;
  @SyncVar() roll: number = 0;
  @SyncVar() isDropShadow: boolean = false;

  @SyncVar() hideInventory: boolean = false;
  @SyncVar() nonTalkFlag: boolean = false;
  @SyncVar() overViewWidth: number = 270;
  @SyncVar() overViewMaxHeight: number = 250;

  @SyncVar() specifyKomaImageFlag: boolean = false;
  @SyncVar() komaImageHeignt: number = 100;

  @SyncVar() chatColorCode: string[] = ['#000000', '#FF0000', '#0099FF'];
  @SyncVar() syncDummyCounter: number = 0;

  chatBubbleAltitude: number = 0;

  _targeted: boolean = false;
  get targeted(): boolean {
    return this._targeted;
  }
  set targeted(flag: boolean) {
    this._targeted = flag;
  }

  _selectedTachieNum: number = 0;
  get selectedTachieNum(): number {
    if (this._selectedTachieNum > this.imageDataElement.children.length - 1) {
      this._selectedTachieNum = this.imageDataElement.children.length - 1;
    }
    if (this._selectedTachieNum < 0) {
      this._selectedTachieNum = 0;
    }

    return this._selectedTachieNum;
  }

  set selectedTachieNum(num: number) {
    if (num > this.imageDataElement.children.length - 1) {
      num = this.imageDataElement.children.length - 1;
    }
    if (num < 0) {
      num = 0;
    }
    this._selectedTachieNum = num;
  }

  private getIconNumElement(): DataElement {
    const iconNum = this.detailDataElement.getFirstElementByName('ICON');
    if (!iconNum || !iconNum.isNumberResource) return null!;
    return iconNum;
  }

  get imageFile(): ImageFile {
    if (!this.imageDataElement) return ImageFile.Empty;

    const iconNum = this.getIconNumElement();
    if (!iconNum) {
      const image: DataElement = this.imageDataElement.getFirstElementByName('imageIdentifier');
      const file = ImageStorage.instance.get(<string>image.value);
      return file ? file : ImageFile.Empty;
    } else {
      let n = <number>iconNum.currentValue;
      if (n > this.imageDataElement.children.length - 1) n = this.imageDataElement.children.length - 1;
      const image = this.imageDataElement.children[n];
      const file = ImageStorage.instance.get(<string>image.value);
      return file ? file : ImageFile.Empty;
    }
  }

  get name(): string {
    return this.getCommonValue('name', '');
  }
  get size(): number {
    return this.getCommonValue('size', 1);
  }
  get chatPalette(): ChatPalette {
    for (const child of this.children) {
      if (child instanceof ChatPalette) return child;
    }
    return null!;
  }

  set name(value: string) {
    this.setCommonValue('name', value);
  }

  TestExec() {}
  get remoteController(): BuffPalette {
    for (const child of this.children) {
      if (child instanceof BuffPalette) {
        return child;
      }
    }
    return null!;
  }

  static create(name: string, size: number, imageIdentifier: string): GameCharacter {
    const gameCharacter: GameCharacter = new GameCharacter();
    gameCharacter.createDataElements();
    gameCharacter.initialize();

    gameCharacter.createTestGameDataElement(name, size, imageIdentifier);

    return gameCharacter;
  }

  addExtendData() {
    this.addBuffDataElement();

    const istachie = this.detailDataElement.getElementsByName('立ち絵位置');
    if (istachie.length == 0) {
      const testElement: DataElement = DataElement.create('立ち絵位置', '', {}, '立ち絵位置' + this.identifier);
      this.detailDataElement.appendChild(testElement);
      testElement.appendChild(
        DataElement.create('POS', 11, { type: 'numberResource', currentValue: '0' }, 'POS_' + this.identifier)
      );
    }

    const iconNum = this.detailDataElement.getElementsByName('コマ画像');
    if (iconNum.length == 0) {
      const elementKoma: DataElement = DataElement.create('コマ画像', '', {}, 'コマ画像' + this.identifier);
      this.detailDataElement.appendChild(elementKoma);

      //コマ画像作成時は立ち絵の次に差し込み
      const tachies = this.detailDataElement.getElementsByName('立ち絵位置');
      if (tachies.length != 0) {
        const parentElement = tachies[0].parent;
        const index: number = parentElement.children.indexOf(tachies[0]);
        if (index < parentElement.children.length - 1) {
          const nextElement = parentElement.children[index + 1];

          parentElement.insertBefore(elementKoma, nextElement);
        }
      }
      elementKoma.appendChild(
        DataElement.create(
          'ICON',
          this.imageDataElement.children.length - 1,
          { type: 'numberResource', currentValue: 0 },
          'ICON_' + this.identifier
        )
      );
    }

    const isbuff = this.buffDataElement.getElementsByName('バフ/デバフ');
    if (isbuff.length == 0) {
      const buffElement: DataElement = DataElement.create('バフ/デバフ', '', {}, 'バフ/デバフ' + this.identifier);
      this.buffDataElement.appendChild(buffElement);
    }
    if (this.remoteController == null) {
      const controller: BuffPalette = new BuffPalette('RemotController_' + this.identifier);
      controller.setPalette(`コントローラ入力例：
マッスルベアー DB+2 3
クリティカルレイ A 18
セイクリッドウェポン 命+1攻+2 18`);
      controller.initialize();
      this.appendChild(controller);
    }
  }

  clone(): this {
    const cloneObject = super.clone();

    let objectname: string;
    const reg = new RegExp('^(.*)_([0-9]+)$');
    let res = cloneObject.name.match(reg);

    let cloneNumber: number;
    if (res != null && res.length == 3) {
      objectname = res[1];
      cloneNumber = parseInt(res[2]) + 1;
    } else {
      objectname = cloneObject.name;
      cloneNumber = 2;
    }

    const list = ObjectStore.instance.getObjects(GameCharacter);
    for (const character of list) {
      if (character.location.name == 'graveyard') continue;

      res = character.name.match(reg);
      if (res != null && res.length == 3 && res[1] == objectname) {
        const numberChk = parseInt(res[2]) + 1;
        if (cloneNumber <= numberChk) {
          cloneNumber = numberChk;
        }
      }
    }

    cloneObject.name = objectname + '_' + cloneNumber;
    cloneObject.update();

    return cloneObject;
  }

  createTestGameDataElement(name: string, size: number, imageIdentifier: string) {
    this.createDataElements();

    const nameElement: DataElement = DataElement.create('name', name, {}, 'name_' + this.identifier);
    const sizeElement: DataElement = DataElement.create('size', size, {}, 'size_' + this.identifier);
    const altitudeElement: DataElement = DataElement.create('altitude', 0, {}, 'altitude_' + this.identifier);

    if (this.imageDataElement.getFirstElementByName('imageIdentifier')) {
      this.imageDataElement.getFirstElementByName('imageIdentifier').value = imageIdentifier;
    }

    const resourceElement: DataElement = DataElement.create('リソース', '', {}, 'リソース' + this.identifier);
    const hpElement: DataElement = DataElement.create(
      'HP',
      200,
      { type: 'numberResource', currentValue: '200' },
      'HP_' + this.identifier
    );
    const mpElement: DataElement = DataElement.create(
      'MP',
      100,
      { type: 'numberResource', currentValue: '100' },
      'MP_' + this.identifier
    );
    //    let sanElement: DataElement = DataElement.create('SAN', 60, { 'type': 'numberResource', 'currentValue': '48' }, 'SAN_' + this.identifier);

    this.commonDataElement.appendChild(nameElement);
    this.commonDataElement.appendChild(sizeElement);
    this.commonDataElement.appendChild(altitudeElement);

    this.detailDataElement.appendChild(resourceElement);
    resourceElement.appendChild(hpElement);
    resourceElement.appendChild(mpElement);
    //    resourceElement.appendChild(sanElement);

    //TEST
    let testElement: DataElement = DataElement.create('情報', '', {}, '情報' + this.identifier);
    this.detailDataElement.appendChild(testElement);
    testElement.appendChild(
      DataElement.create('説明', 'ここに説明を書く\nあいうえお', { type: 'note' }, '説明' + this.identifier)
    );
    testElement.appendChild(
      DataElement.create('メモ', '任意の文字列\n１\n２\n３\n４\n５', { type: 'note' }, 'メモ' + this.identifier)
    );

    //TEST
    testElement = DataElement.create('能力', '', {}, '能力' + this.identifier);
    this.detailDataElement.appendChild(testElement);
    testElement.appendChild(DataElement.create('器用度', 24, {}, '器用度' + this.identifier));
    testElement.appendChild(DataElement.create('敏捷度', 24, {}, '敏捷度' + this.identifier));
    testElement.appendChild(DataElement.create('筋力', 24, {}, '筋力' + this.identifier));
    testElement.appendChild(DataElement.create('生命力', 24, {}, '生命力' + this.identifier));
    testElement.appendChild(DataElement.create('知力', 24, {}, '知力' + this.identifier));
    testElement.appendChild(DataElement.create('精神力', 24, {}, '精神力' + this.identifier));

    //TEST
    testElement = DataElement.create('戦闘特技', '', {}, '戦闘特技' + this.identifier);
    this.detailDataElement.appendChild(testElement);
    testElement.appendChild(DataElement.create('Lv1', '全力攻撃', {}, 'Lv1' + this.identifier));
    testElement.appendChild(DataElement.create('Lv3', '武器習熟/ソード', {}, 'Lv3' + this.identifier));
    testElement.appendChild(DataElement.create('Lv5', '武器習熟/ソードⅡ', {}, 'Lv5' + this.identifier));
    testElement.appendChild(DataElement.create('Lv7', '頑強', {}, 'Lv7' + this.identifier));
    testElement.appendChild(DataElement.create('Lv9', '薙ぎ払い', {}, 'Lv9' + this.identifier));
    testElement.appendChild(DataElement.create('自動', '治癒適正', {}, '自動' + this.identifier));

    const palette: ChatPalette = new ChatPalette('ChatPalette_' + this.identifier);
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
    this.appendChild(palette);

    this.addExtendData();
  }

  createTestGameDataElementCheckTable(name: string, size: number, imageIdentifier: string) {
    this.createDataElements();

    const nameElement: DataElement = DataElement.create('name', name, {}, 'name_' + this.identifier);
    const sizeElement: DataElement = DataElement.create('size', size, {}, 'size_' + this.identifier);
    const altitudeElement: DataElement = DataElement.create('altitude', 0, {}, 'altitude_' + this.identifier);

    if (this.imageDataElement.getFirstElementByName('imageIdentifier')) {
      this.imageDataElement.getFirstElementByName('imageIdentifier').value = imageIdentifier;
    }

    const resourceElement: DataElement = DataElement.create('リソース', '', {}, 'リソース' + this.identifier);
    const hpElement: DataElement = DataElement.create(
      'HP',
      200,
      { type: 'numberResource', currentValue: '200' },
      'HP_' + this.identifier
    );
    const mpElement: DataElement = DataElement.create(
      'MP',
      100,
      { type: 'numberResource', currentValue: '100' },
      'MP_' + this.identifier
    );

    this.commonDataElement.appendChild(nameElement);
    this.commonDataElement.appendChild(sizeElement);
    this.commonDataElement.appendChild(altitudeElement);

    this.detailDataElement.appendChild(resourceElement);
    resourceElement.appendChild(hpElement);
    resourceElement.appendChild(mpElement);

    //TEST
    let testElement: DataElement = DataElement.create('情報', '', {}, '情報' + this.identifier);
    this.detailDataElement.appendChild(testElement);

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
    testElement.appendChild(DataElement.create('忍術', textMarkDown, { type: 'markdown' }, '忍術' + this.identifier));

    const textMarkDownNecro = `|損傷|使用|タイミング|コスト|射程|効果|
|[]こぶし|[]|アクション|2|0|肉弾攻撃1|
|[]うで|[]|ジャッジ|1|0|支援1|`;

    testElement.appendChild(
      DataElement.create(
        'ネクロニカ的パーツ',
        textMarkDownNecro,
        { type: 'markdown' },
        'ネクロニカ的パーツ' + this.identifier
      )
    );

    testElement.appendChild(
      DataElement.create(
        '宝物への依存',
        '[][][][] 幼児退行',
        { type: 'markdown' },
        'ネクロニカ的未練' + this.identifier
      )
    );

    this.overViewWidth = 800;
    this.overViewMaxHeight = 620;

    //TEST
    testElement = DataElement.create('能力', '', {}, '能力' + this.identifier);
    this.detailDataElement.appendChild(testElement);
    testElement.appendChild(DataElement.create('器用度', 24, {}, '器用度' + this.identifier));
    testElement.appendChild(DataElement.create('敏捷度', 24, {}, '敏捷度' + this.identifier));
    testElement.appendChild(DataElement.create('筋力', 24, {}, '筋力' + this.identifier));
    testElement.appendChild(DataElement.create('生命力', 24, {}, '生命力' + this.identifier));
    testElement.appendChild(DataElement.create('知力', 24, {}, '知力' + this.identifier));
    testElement.appendChild(DataElement.create('精神力', 24, {}, '精神力' + this.identifier));

    //TEST
    testElement = DataElement.create('戦闘特技', '', {}, '戦闘特技' + this.identifier);
    this.detailDataElement.appendChild(testElement);
    testElement.appendChild(DataElement.create('Lv1', '全力攻撃', {}, 'Lv1' + this.identifier));
    testElement.appendChild(DataElement.create('Lv3', '武器習熟/ソード', {}, 'Lv3' + this.identifier));
    testElement.appendChild(DataElement.create('Lv5', '武器習熟/ソードⅡ', {}, 'Lv5' + this.identifier));
    testElement.appendChild(DataElement.create('Lv7', '頑強', {}, 'Lv7' + this.identifier));
    testElement.appendChild(DataElement.create('Lv9', '薙ぎ払い', {}, 'Lv9' + this.identifier));
    testElement.appendChild(DataElement.create('自動', '治癒適正', {}, '自動' + this.identifier));

    const palette: ChatPalette = new ChatPalette('ChatPalette_' + this.identifier);
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
    this.appendChild(palette);

    this.addExtendData();
  }

  createTestGameDataElementExtendSample(name: string, size: number, imageIdentifier: string) {
    this.createDataElements();

    const nameElement: DataElement = DataElement.create('name', name, {}, 'name_' + this.identifier);
    const sizeElement: DataElement = DataElement.create('size', size, {}, 'size_' + this.identifier);
    const altitudeElement: DataElement = DataElement.create('altitude', 0, {}, 'altitude_' + this.identifier);

    if (this.imageDataElement.getFirstElementByName('imageIdentifier')) {
      this.imageDataElement.getFirstElementByName('imageIdentifier').value = imageIdentifier;
    }

    //    let resourceElement: DataElement = DataElement.create('リソース', '', {}, 'リソース' + this.identifier);
    //    let hpElement: DataElement = DataElement.create('HP', 200, { 'type': 'numberResource', 'currentValue': '200' }, 'HP_' + this.identifier);
    //    let mpElement: DataElement = DataElement.create('MP', 100, { 'type': 'numberResource', 'currentValue': '100' }, 'MP_' + this.identifier);

    this.commonDataElement.appendChild(nameElement);
    this.commonDataElement.appendChild(sizeElement);
    this.commonDataElement.appendChild(altitudeElement);

    //    this.detailDataElement.appendChild(resourceElement);
    //    resourceElement.appendChild(hpElement);
    //    resourceElement.appendChild(mpElement);

    //TEST
    const testElement: DataElement = DataElement.create('情報', '', {}, '情報' + this.identifier);
    this.detailDataElement.appendChild(testElement);
    testElement.appendChild(
      DataElement.create(
        '説明',
        `このキャラクターはキャラクターBの補助用のコマを作るときのサンプルです。
まず、このキャラクターはキャラクターシートの設定で「テーブルインベントリ非表示」「発言をしない」のチェックが入っています。
このように設定したキャラクターは「非表示」で足元のサークルの色が青に変わり、テーブルインベントリやリリィ追加機能のカウンターリモコンに表示されなくなります。
戦闘非参加キャラを立ち絵やコマのためにテーブルに出したい場合に使用できます。
また、プロフ等の追加情報を表示するためのコマ等、発言が不要な場合、「発言をしない」のチェックを入れることでチャットタブ等のリストに表示されなくなります。
部位数が10あるモンスターの駒を出したけど頭だけ喋ればいい、等の場合に使います。このチェックをONにするとコマの上のキャラ名が白地に黒文字に変わります。
次に、ポップアップのサイズ設定です。リリィではキャラクターシートからポップアップの横幅、最大縦幅を変更可能な様に拡張しています。
これで遊ぶ仲間が許してくれれば、数千文字のプロフィールを書いても大丈夫です。\n
なお、ポップアップする項目の設定は インベントリ＞設定＞表示項目 で行います。
リリィでは説明のため初期の項目に情報をに追加しているので、情報の子項目のこの文章である「説明」と「持ち物」が表示されています。
定義されていても持っていない項目は表示されないのでこのコマからはHPや能力値を削っています。
ゲームごとに使いやすいように使ってください。
`,
        { type: 'note' },
        '説明' + this.identifier
      )
    );
    testElement.appendChild(
      DataElement.create(
        '持ち物',
        `こういった文章も見やすくなります。
アイテム1：3個　効果〇〇
アイテム2：3個　効果パーティ内一人のHPをXXする
アイテム3：3個　効果敵一人の魔法を△する
アイテム4：3個　効果A
アイテム5：3個　効果B`,
        { type: 'note' },
        '持ち物' + this.identifier
      )
    );

    const palette: ChatPalette = new ChatPalette('ChatPalette_' + this.identifier);
    palette.setPalette(`チャットパレット入力例：
2d6+1 ダイスロール
１ｄ２０＋{敏捷}＋｛格闘｝　{name}の格闘！
//敏捷=10+{敏捷A}
//敏捷A=10
//格闘＝１`);
    palette.initialize();
    this.appendChild(palette);
    this.addExtendData();
  }

  deleteBuff(name: string): boolean {
    if (this.buffDataElement.children) {
      const dataElm = this.buffDataElement.children[0];
      const data = (dataElm as DataElement).getFirstElementByName(name);
      if (!data) return false;
      data.destroy();
      return true;
    }
    return false;
  }

  decreaseBuffRound() {
    if (this.buffDataElement.children) {
      const dataElm = this.buffDataElement.children[0];
      for (const data of dataElm.children) {
        const oldNumS = data.value as string;
        let sum = parseInt(oldNumS);
        sum = sum - 1;
        data.value = sum;
      }
    }
  }

  increaseBuffRound() {
    if (this.buffDataElement.children) {
      const dataElm = this.buffDataElement.children[0];
      for (const data of dataElm.children) {
        const oldNumS = data.value as string;
        let sum = parseInt(oldNumS);
        sum = sum + 1;
        data.value = sum;
      }
    }
  }

  deleteZeroRoundBuff() {
    if (this.buffDataElement.children) {
      const dataElm = this.buffDataElement.children[0];
      for (const data of dataElm.children) {
        const oldNumS = data.value as string;
        const num = parseInt(oldNumS);
        if (num <= 0) {
          data.destroy();
        }
      }
    }
  }

  addBuffRound(name: string, _info?: string, _round?: number) {
    let info = '';
    let round = 3;
    if (_info) {
      info = _info;
    }
    if (_round != null) {
      round = _round;
    }
    if (this.buffDataElement.children) {
      const dataElm = this.buffDataElement.children[0];
      const data = this.buffDataElement.getFirstElementByName(name);
      if (data) {
        data.value = round;
        data.currentValue = info;
      } else {
        dataElm.appendChild(
          DataElement.create(name, round, {
            type: 'numberResource',
            currentValue: info,
          })
        );
      }
    }
  }

  chkChangeStatusName(name: string): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    if (data.type == 'numberResource') {
      return true;
    }
    if (data.type == '') {
      return true;
    }
    if (data.type == 'note') {
      return true;
    }
    return false;
  }

  chkChangeStatus(name: string, nowOrMax: string): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    if (data.type == 'numberResource') {
      if (nowOrMax == 'now' || nowOrMax == 'max') {
        return true;
      }
    } else if (data.type == '') {
      if (nowOrMax == 'now') {
        return true;
      }
    } else if (data.type == 'note') {
      if (nowOrMax == 'now') {
        return true;
      }
    }
    return false;
  }

  getStatusType(name: string, nowOrMax: string): string {
    let type: string | undefined;
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return null!;

    if (data.type == 'numberResource') {
      if (nowOrMax == 'now') {
        type = 'currentValue';
      } else if (nowOrMax == 'max') {
        type = 'value';
      }
    } else if (data.type == '') {
      if (nowOrMax == 'now') {
        type = 'value';
      } else {
        return null!;
      }
    } else {
      return null!;
    }
    return type!;
  }

  getStatusTextType(name: string): string {
    let type: string;
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return null!;

    if (data.type == 'numberResource') {
      type = 'currentValue';
    } else {
      type = 'value';
    }
    return type;
  }

  getStatusValue(name: string, nowOrMax: string): number {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return null!;
    const type = this.getStatusType(name, nowOrMax);
    if (type == null) return null!;

    let oldNumS: string | undefined;

    if (type == 'value') {
      oldNumS = data.value as string;
    }
    if (type == 'currentValue') {
      oldNumS = data.currentValue as string;
    }
    return parseInt(oldNumS!);
  }

  setStatusValue(name: string, nowOrMax: string, setValue: number): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    const type = this.getStatusType(name, nowOrMax);
    if (type == null) return false;

    if (type == 'value') {
      data.value = setValue;
    }
    if (type == 'currentValue') {
      data.currentValue = setValue;
    }
    return true;
  }

  setStatusText(name: string, text: string): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    const type = this.getStatusTextType(name);
    if (type == null) return false;
    if (type == 'value') {
      data.value = text;
    }
    if (type == 'currentValue') {
      data.currentValue = text;
    }
    return true;
  }

  changeStatusValue(name: string, nowOrMax: string, addValue: number, limitMin?: boolean, limitMax?: boolean): string {
    const data = this.detailDataElement.getFirstElementByName(name);
    let text = '';
    const type = this.getStatusType(name, nowOrMax);
    if (!data) return text;

    const oldNum: number = this.getStatusValue(name, nowOrMax);
    if (oldNum == null) return text;
    let sum = oldNum + addValue;

    let maxRecoveryMess = '';
    if (type == 'value') {
      if (limitMin && sum <= 0 && limitMin) {
        maxRecoveryMess = '(最小)';
        sum = 0;
      }
      this.setStatusValue(name, nowOrMax, sum);
    }
    if (type == 'currentValue') {
      if (sum >= +data.value && limitMax) {
        maxRecoveryMess = '(最大)';
        sum = this.getStatusValue(name, 'max');
      }
      if (limitMin && sum <= 0 && limitMin) {
        maxRecoveryMess = '(最小)';
        sum = 0;
      }
      this.setStatusValue(name, nowOrMax, sum);
    }
    text = text + '[' + this.name + ' ' + oldNum + '>' + sum + maxRecoveryMess + '] ';
    return text;
  }
}
