import { resolveBuffColor } from '@axe/domain/character/buff-appearance';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import {
  applyBuffEdit,
  applyResourceEdit,
  applyTextEdit,
  type BuffEdit,
  convertCommandToResourceEdit,
  createDefaultResourceEdit,
  parseResourceEditOption,
  type ResourceEdit,
} from '@axe/domain/data/resource-edit-helpers';

describe('resource-edit-helpers', () => {
  describe('parseResourceEditOption', () => {
    it('オプション無しの場合はすべてfalseを返す', () => {
      const result = parseResourceEditOption('HP+10');
      expect(result.limitMinMax).toBe(false);
      expect(result.zeroLimit).toBe(false);
      expect(result.isErr).toBe(false);
    });

    it('LZの組み合わせで両方が有効になる', () => {
      const result = parseResourceEditOption('HP+10LZ');
      expect(result.limitMinMax).toBe(true);
      expect(result.zeroLimit).toBe(true);
      expect(result.isErr).toBe(false);
    });

    it('不明なオプション文字でisErrがtrueになる', () => {
      expect(parseResourceEditOption('HP+10X').isErr).toBe(true);
    });
  });

  describe('createDefaultResourceEdit', () => {
    it('デフォルト値を返す', () => {
      const edit = createDefaultResourceEdit();
      expect(edit.target).toBe('');
      expect(edit.operator).toBe('');
      expect(edit.nowOrMax).toBe('now');
      expect(edit.isDiceRoll).toBe(false);
      expect(edit.calcAns).toBe(0);
    });
  });

  describe('convertCommandToResourceEdit', () => {
    let character: GameCharacter;

    beforeEach(() => {
      character = GameCharacter.create('テスト戦士', 1, '');
    });

    it('リソース加算コマンドを正しくパースする', () => {
      const edit = createDefaultResourceEdit();

      const ok = convertCommandToResourceEdit(edit, ':HP+10', character, false);

      expect(ok).toBe(true);
      expect(edit.target).toBe('HP');
      expect(edit.operator).toBe('+');
      expect(edit.command).toBe('10+(1d1-1)');
      expect(edit.targeted).toBe(false);
    });

    it('最大値指定(^)でnowOrMaxがmaxになる', () => {
      const edit = createDefaultResourceEdit();

      const ok = convertCommandToResourceEdit(edit, ':HP^+50', character, true);

      expect(ok).toBe(true);
      expect(edit.nowOrMax).toBe('max');
      expect(edit.targeted).toBe(true);
    });

    it('_MAX サフィックスで maxBase をターゲットにする', () => {
      const edit = createDefaultResourceEdit();
      const ok = convertCommandToResourceEdit(edit, ':HP_MAX+5', character, false);
      expect(ok).toBe(true);
      expect(edit.nowOrMax).toBe('maxBase');
      expect(edit.target).toBe('HP');
    });

    it('_MAX_BUFF サフィックスで maxCorrection をターゲットにする', () => {
      const edit = createDefaultResourceEdit();
      const ok = convertCommandToResourceEdit(edit, ':HP_MAX_BUFF+5', character, false);
      expect(ok).toBe(true);
      expect(edit.nowOrMax).toBe('maxCorrection');
      expect(edit.target).toBe('HP');
    });

    it('_MIN サフィックスで minBase をターゲットにする', () => {
      const edit = createDefaultResourceEdit();
      const ok = convertCommandToResourceEdit(edit, ':HP_MIN-3', character, false);
      expect(ok).toBe(true);
      expect(edit.nowOrMax).toBe('minBase');
      expect(edit.target).toBe('HP');
    });

    it('_MIN_BUFF サフィックスで minCorrection をターゲットにする', () => {
      const edit = createDefaultResourceEdit();
      const ok = convertCommandToResourceEdit(edit, ':HP_MIN_BUFF-3', character, false);
      expect(ok).toBe(true);
      expect(edit.nowOrMax).toBe('minCorrection');
      expect(edit.target).toBe('HP');
    });

    it('サフィックスは大文字小文字を区別しない', () => {
      const edit = createDefaultResourceEdit();
      const ok = convertCommandToResourceEdit(edit, ':HP_max_buff+5', character, false);
      expect(ok).toBe(true);
      expect(edit.nowOrMax).toBe('maxCorrection');
    });

    it('存在しないステータス名ではfalseを返す', () => {
      const edit = createDefaultResourceEdit();
      expect(convertCommandToResourceEdit(edit, ':存在しない+10', character, false)).toBe(false);
    });
  });

  describe('applyTextEdit / applyResourceEdit / applyBuffEdit', () => {
    let character: GameCharacter;

    beforeEach(() => {
      character = GameCharacter.create('テスト戦士', 1, '');
    });

    it('applyTextEdit はテキスト値を書き換える', () => {
      const edit = createDefaultResourceEdit();
      edit.target = '器用度';
      edit.replace = '30';

      const text = applyTextEdit(edit, character);

      expect(text).toContain('器用度＞30');
    });

    it('applyResourceEdit は = で現在値を代入する', () => {
      const edit: ResourceEdit = {
        ...createDefaultResourceEdit(),
        target: 'HP',
        operator: '=',
        diceResult: '50',
        command: '50+(1d1-1)',
        calcAns: 50,
        option: { limitMinMax: false, zeroLimit: false, isErr: false },
        object: character,
      };

      const text = applyResourceEdit(edit, character);

      expect(text).toContain('50');
      expect(character.status.getValue('HP', 'now')).toBe(50);
    });

    it('applyBuffEdit はバフ付与テキストを返す', () => {
      const buff: BuffEdit = { command: '&マッスルベアー/筋B+2/3', object: character, targeted: false };

      const text = applyBuffEdit(buff, character);

      expect(text).toContain('バフを付与');
      expect(text).toContain('マッスルベアー');
    });

    it('applyBuffEdit は 4 つ目以降で見た目を指定できる', () => {
      const buff: BuffEdit = { command: '&毒/継続2/3/red/☠️', object: character, targeted: false };

      const text = applyBuffEdit(buff, character);
      const data = character.buffDataElement!.children[0].children[0] as DataElement;

      expect(text).toContain('red');
      expect(data.getAttribute(DataElementAttribute.BUFF_COLOR)).toBe(resolveBuffColor('red'));
      expect(data.getAttribute(DataElementAttribute.BUFF_ICON)).toBe('☠️');
    });
  });
});
