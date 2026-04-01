import { TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { IPeerContext } from '@axe/core/network/peer-context';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceSymbol, DiceType } from '@axe/domain/dice/dice-symbol';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

describe('DiceSymbol', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('DiceType enum', () => {
    it('D2 = 0', () => {
      expect(DiceType.D2).toBe(0);
    });

    it('D4 = 1', () => {
      expect(DiceType.D4).toBe(1);
    });

    it('D6 = 2', () => {
      expect(DiceType.D6).toBe(2);
    });

    it('D8 = 3', () => {
      expect(DiceType.D8).toBe(3);
    });

    it('D10 = 4', () => {
      expect(DiceType.D10).toBe(4);
    });

    it('D10_10TIMES = 5', () => {
      expect(DiceType.D10_10TIMES).toBe(5);
    });

    it('D12 = 6', () => {
      expect(DiceType.D12).toBe(6);
    });

    it('D20 = 7', () => {
      expect(DiceType.D20).toBe(7);
    });
  });

  describe('create()', () => {
    it('名前を設定する', () => {
      const dice = DiceSymbol.create('テストダイス', DiceType.D6, 1);
      expect(dice.name).toBe('テストダイス');
    });

    it('サイズを設定する', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 2);
      expect(dice.size).toBe(2);
    });

    it('ObjectStoreに追加される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(store.get(dice.identifier)).toBe(dice);
    });

    it('カスタム identifier を指定できる', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1, 'custom-dice-id');
      expect(dice.identifier).toBe('custom-dice-id');
    });

    it('identifier 未指定で自動生成される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.identifier).toBeTruthy();
      expect(dice.identifier.length).toBeGreaterThan(0);
    });

    it('rootDataElement が作成される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.rootDataElement).toBeTruthy();
    });

    it('commonDataElement が作成される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.commonDataElement).toBeTruthy();
    });

    it('imageDataElement が作成される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.imageDataElement).toBeTruthy();
    });
  });

  describe('aliasName', () => {
    it('"dice-symbol" を返す', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.aliasName).toBe('dice-symbol');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLock がデフォルト false', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.isLock).toBe(false);
    });

    it('owner がデフォルト空文字', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.owner).toBe('');
    });

    it('rotate がデフォルト 0', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.rotate).toBe(0);
    });
  });

  describe('faces', () => {
    it('D2 は2面を持つ', () => {
      const dice = DiceSymbol.create('d2', DiceType.D2, 1);
      expect(dice.faces).toHaveLength(2);
      expect(dice.faces).toEqual(['1', '2']);
    });

    it('D4 は4面を持つ', () => {
      const dice = DiceSymbol.create('d4', DiceType.D4, 1);
      expect(dice.faces).toHaveLength(4);
      expect(dice.faces).toEqual(['1', '2', '3', '4']);
    });

    it('D6 は6面を持つ', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.faces).toHaveLength(6);
      expect(dice.faces).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('D8 は8面を持つ', () => {
      const dice = DiceSymbol.create('d8', DiceType.D8, 1);
      expect(dice.faces).toHaveLength(8);
    });

    it('D10 は10面を持つ', () => {
      const dice = DiceSymbol.create('d10', DiceType.D10, 1);
      expect(dice.faces).toHaveLength(10);
      expect(dice.faces[0]).toBe('1');
      expect(dice.faces[9]).toBe('10');
    });

    it('D10_10TIMES は10面で10倍値を持つ', () => {
      const dice = DiceSymbol.create('d100', DiceType.D10_10TIMES, 1);
      expect(dice.faces).toHaveLength(10);
      expect(dice.faces).toEqual(['10', '20', '30', '40', '50', '60', '70', '80', '90', '100']);
    });

    it('D12 は12面を持つ', () => {
      const dice = DiceSymbol.create('d12', DiceType.D12, 1);
      expect(dice.faces).toHaveLength(12);
    });

    it('D20 は20面を持つ', () => {
      const dice = DiceSymbol.create('d20', DiceType.D20, 1);
      expect(dice.faces).toHaveLength(20);
      expect(dice.faces[0]).toBe('1');
      expect(dice.faces[19]).toBe('20');
    });
  });

  describe('face (初期値)', () => {
    it('create後は最初の面が選択される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.face).toBe('1');
    });

    it('D10_10TIMES の初期面は "10"', () => {
      const dice = DiceSymbol.create('d100', DiceType.D10_10TIMES, 1);
      expect(dice.face).toBe('10');
    });
  });

  describe('diceRoll()', () => {
    it('faces の中の値を返す', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      const result = dice.diceRoll();
      expect(dice.faces).toContain(result);
    });

    it('face プロパティが更新される', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      const result = dice.diceRoll();
      expect(dice.face).toBe(result);
    });

    it('facesが空の場合は空文字を返す', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      // imageDataElementの子要素を全て削除してfacesを空にする
      dice.imageDataElement.children.forEach((child) => child.destroy());
      const result = dice.diceRoll();
      expect(result).toBe('');
    });

    it('複数回ロールしても常にfacesの値', () => {
      const dice = DiceSymbol.create('d20', DiceType.D20, 1);
      for (let i = 0; i < 50; i++) {
        const result = dice.diceRoll();
        expect(dice.faces).toContain(result);
      }
    });
  });

  describe('setDicetype()', () => {
    it('ダイスタイプを変更できる', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.faces).toHaveLength(6);

      dice.setDicetype(DiceType.D20);
      expect(dice.faces).toHaveLength(20);
    });

    it('タイプ変更後にfaceが先頭面にリセットされる', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.face = '5';

      dice.setDicetype(DiceType.D4);
      expect(dice.face).toBe('1');
    });

    it('以前のface要素が削除される', () => {
      const dice = DiceSymbol.create('d20', DiceType.D20, 1);
      expect(dice.faces).toHaveLength(20);

      dice.setDicetype(DiceType.D2);
      expect(dice.faces).toHaveLength(2);
    });
  });

  describe('name getter/setter', () => {
    it('名前を変更できる', () => {
      const dice = DiceSymbol.create('初期名', DiceType.D6, 1);
      dice.name = '新しい名前';
      expect(dice.name).toBe('新しい名前');
    });
  });

  describe('size getter/setter', () => {
    it('サイズを変更できる', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.size = 3;
      expect(dice.size).toBe(3);
    });
  });

  describe('owner 関連', () => {
    it('hasOwner はownerが空文字ならfalse', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.hasOwner).toBe(false);
    });

    it('hasOwner はownerがセットされていればtrue', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.owner = 'user-123';
      expect(dice.hasOwner).toBe(true);
    });

    it('ownerName はownerが見つからなければ空文字', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.owner = 'nonexistent-user';
      vi.spyOn(PeerCursor, 'findByUserId').mockReturnValue(null!);
      expect(dice.ownerName).toBe('');
    });

    it('ownerName はownerが見つかればその名前', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.owner = 'user-123';
      vi.spyOn(PeerCursor, 'findByUserId').mockReturnValue({ name: 'テストユーザー' } as PeerCursor);
      expect(dice.ownerName).toBe('テストユーザー');
    });
  });

  describe('visibility', () => {
    it('ownerがいなければisVisible=true', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.isVisible).toBe(true);
    });

    it('ownerが自分ならisVisible=true', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.owner = 'my-user';
      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'my-user' } as IPeerContext);
      expect(dice.isMine).toBe(true);
      expect(dice.isVisible).toBe(true);
    });

    it('ownerが他人ならisVisible=false', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      dice.owner = 'other-user';
      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'my-user' } as IPeerContext);
      expect(dice.isMine).toBe(false);
      expect(dice.isVisible).toBe(false);
    });
  });

  describe('TabletopObject 継承', () => {
    it('location のデフォルトが table', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.location.name).toBe('table');
    });

    it('posZ のデフォルトが 0', () => {
      const dice = DiceSymbol.create('d6', DiceType.D6, 1);
      expect(dice.posZ).toBe(0);
    });
  });
});
