import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';

import { ResourceEdit, ResourceEditProcessor } from './resource-edit-processor';

describe('ResourceEditProcessor', () => {
  let store: ObjectStore;
  let processor: ResourceEditProcessor;

  const mockDiceRollAsync = vi.fn();
  const mockLoadGameSystemAsync = vi.fn();

  beforeEach(() => {
    store = ObjectStore.instance;
    processor = new ResourceEditProcessor(mockDiceRollAsync, mockLoadGameSystemAsync);
    vi.clearAllMocks();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('parseOption', () => {
    it('オプション無しの場合はすべてfalseを返す', () => {
      const result = processor.parseOption('HP+10');
      expect(result.limitMinMax).toBe(false);
      expect(result.zeroLimit).toBe(false);
      expect(result.isErr).toBe(false);
    });

    it('Lオプションでlimitが有効になる', () => {
      const result = processor.parseOption('HP+10L');
      expect(result.limitMinMax).toBe(true);
      expect(result.isErr).toBe(false);
    });

    it('Zオプションでzeroが有効になる', () => {
      const result = processor.parseOption('HP+10Z');
      expect(result.zeroLimit).toBe(true);
      expect(result.isErr).toBe(false);
    });

    it('LZの組み合わせで両方が有効になる', () => {
      const result = processor.parseOption('HP+10LZ');
      expect(result.limitMinMax).toBe(true);
      expect(result.zeroLimit).toBe(true);
      expect(result.isErr).toBe(false);
    });

    it('不明なオプション文字でisErrがtrueになる', () => {
      const result = processor.parseOption('HP+10X');
      expect(result.isErr).toBe(true);
    });

    it('Dは正規表現でオプションとして扱われない（diceのD）', () => {
      const result = processor.parseOption('HP+10D');
      // D is excluded from [A-CE-Z] pattern — no options matched
      expect(result.limitMinMax).toBe(false);
      expect(result.zeroLimit).toBe(false);
      expect(result.isErr).toBe(false);
    });
  });

  describe('defaultResourceEdit', () => {
    it('デフォルトのResourceEditオブジェクトを返す', () => {
      const edit = processor.defaultResourceEdit();
      expect(edit.target).toBe('');
      expect(edit.operator).toBe('');
      expect(edit.command).toBe('');
      expect(edit.isDiceRoll).toBe(false);
      expect(edit.calcAns).toBe(0);
      expect(edit.nowOrMax).toBe('now');
    });
  });

  describe('commandToEdit', () => {
    let character: GameCharacter;

    beforeEach(() => {
      character = GameCharacter.create('テスト戦士', 1, '');
    });

    it('リソース加算コマンドを正しくパースする', () => {
      const edit = processor.defaultResourceEdit();
      const result = processor.commandToEdit(edit, ':HP+10', character, false);

      expect(result).toBe(true);
      expect(edit.target).toBe('HP');
      expect(edit.operator).toBe('+');
      expect(edit.nowOrMax).toBe('now');
    });

    it('リソース減算コマンドをパースする', () => {
      const edit = processor.defaultResourceEdit();
      const result = processor.commandToEdit(edit, ':HP-5', character, false);

      expect(result).toBe(true);
      expect(edit.target).toBe('HP');
      expect(edit.operator).toBe('-');
    });

    it('代入コマンド(=)をパースする', () => {
      const edit = processor.defaultResourceEdit();
      const result = processor.commandToEdit(edit, ':HP=100', character, false);

      expect(result).toBe(true);
      expect(edit.operator).toBe('=');
    });

    it('テキスト置換コマンド(>)をパースする', () => {
      const edit = processor.defaultResourceEdit();
      const result = processor.commandToEdit(edit, ':器用度>30', character, false);

      expect(result).toBe(true);
      expect(edit.operator).toBe('>');
      expect(edit.replace).toBe('30');
    });

    it('最大値指定(^)でnowOrMaxがmaxになる', () => {
      const edit = processor.defaultResourceEdit();
      const result = processor.commandToEdit(edit, ':HP^+50', character, false);

      expect(result).toBe(true);
      expect(edit.nowOrMax).toBe('max');
    });

    it('存在しないステータス名ではfalseを返す', () => {
      const edit = processor.defaultResourceEdit();
      const result = processor.commandToEdit(edit, ':存在しないステータス+10', character, false);

      expect(result).toBe(false);
    });

    it('targeted=trueが設定される', () => {
      const edit = processor.defaultResourceEdit();
      processor.commandToEdit(edit, ':HP+10', character, true);

      expect(edit.targeted).toBe(true);
    });
  });

  describe('textEdit', () => {
    let character: GameCharacter;

    beforeEach(() => {
      character = GameCharacter.create('テスト', 1, '');
    });

    it('テキスト値を書き換えて結果文字列を返す', () => {
      const edit = processor.defaultResourceEdit();
      edit.target = '器用度';
      edit.replace = '30';

      const result = processor.textEdit(edit, character);
      expect(result).toContain('器用度');
      expect(result).toContain('30');
    });
  });

  describe('resourceEdit', () => {
    let character: GameCharacter;

    beforeEach(() => {
      character = GameCharacter.create('テスト戦士', 1, '');
    });

    it('加算で現在値を変更し結果文字列を返す', () => {
      const edit: ResourceEdit = {
        target: 'HP',
        operator: '+',
        diceResult: '10',
        command: '+10+(1d1-1)',
        replace: '',
        isDiceRoll: false,
        calcAns: 10,
        nowOrMax: 'now',
        option: { limitMinMax: false, zeroLimit: false, isErr: false },
        object: character,
        targeted: false,
      };

      const result = processor.resourceEdit(edit, character);
      expect(result).toContain('HP');
      expect(result).toContain('200'); // 初期値
    });

    it('=で代入する', () => {
      const edit: ResourceEdit = {
        target: 'HP',
        operator: '=',
        diceResult: '50',
        command: '50+(1d1-1)',
        replace: '',
        isDiceRoll: false,
        calcAns: 50,
        nowOrMax: 'now',
        option: { limitMinMax: false, zeroLimit: false, isErr: false },
        object: character,
        targeted: false,
      };

      const result = processor.resourceEdit(edit, character);
      expect(result).toContain('50');
      expect(character.status.getValue('HP', 'now')).toBe(50);
    });

    it('limitMinMaxで最大値を超えない', () => {
      const edit: ResourceEdit = {
        target: 'HP',
        operator: '+',
        diceResult: '999',
        command: '+999+(1d1-1)',
        replace: '',
        isDiceRoll: false,
        calcAns: 999,
        nowOrMax: 'now',
        option: { limitMinMax: true, zeroLimit: false, isErr: false },
        object: character,
        targeted: false,
      };

      const result = processor.resourceEdit(edit, character);
      expect(result).toContain('(最大)');
      expect(character.status.getValue('HP', 'now')).toBe(200);
    });

    it('zeroLimitで+に対して負の値を0制限する', () => {
      const edit: ResourceEdit = {
        target: 'HP',
        operator: '+',
        diceResult: '-300',
        command: '-300+(1d1-1)',
        replace: '',
        isDiceRoll: false,
        calcAns: -300,
        nowOrMax: 'now',
        option: { limitMinMax: false, zeroLimit: true, isErr: false },
        object: character,
        targeted: false,
      };

      const result = processor.resourceEdit(edit, character);
      expect(result).toContain('(0制限)');
    });
  });

  describe('buffEdit', () => {
    let character: GameCharacter;

    beforeEach(() => {
      character = GameCharacter.create('テスト戦士', 1, '');
    });

    it('バフを付与する', () => {
      const result = processor.buffEdit(
        { command: '&マッスルベアー/筋B+2/3', object: character, targeted: false },
        character
      );

      expect(result).toContain('バフを付与');
      expect(result).toContain('マッスルベアー');
    });

    it('&R-でバフRを減少する', () => {
      character.buffs.addRound('テストバフ', '', 3);
      const result = processor.buffEdit({ command: '&R-', object: character, targeted: false }, character);

      expect(result).toContain('バフRを減少');
    });

    it('&R+でバフRを増加する', () => {
      character.buffs.addRound('テストバフ', '', 3);
      const result = processor.buffEdit({ command: '&R+', object: character, targeted: false }, character);

      expect(result).toContain('バフRを増加');
    });

    it('&Dで0R以下のバフを消去する', () => {
      const result = processor.buffEdit({ command: '&D', object: character, targeted: false }, character);

      expect(result).toContain('0R以下のバフを消去');
    });

    it('&バフ名-でバフを消去する', () => {
      character.buffs.addRound('消去対象', '', 3);
      const result = processor.buffEdit({ command: '&消去対象-', object: character, targeted: false }, character);

      expect(result).toContain('消去対象を消去');
    });

    it('targetedがtrueの場合はキャラクター名が含まれる', () => {
      const result = processor.buffEdit({ command: '&テストバフ', object: character, targeted: true }, character);

      expect(result).toContain('テスト戦士');
    });
  });
});
