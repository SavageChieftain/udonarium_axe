import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { BuffPalette, ChatPalette, DiceTablePalette } from '@axe/domain/chat/chat-palette';
import { DataElement, DataElementFieldType } from '@axe/domain/data/data-element';

describe('ChatPalette', () => {
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
  });

  describe('SyncVar デフォルト値', () => {
    it('dicebot がデフォルト "DiceBot"', () => {
      const palette = new ChatPalette();
      palette.initialize();
      expect(palette.dicebot).toBe('DiceBot');
    });
  });

  describe('getPalette / setPalette', () => {
    it('パレットを設定してパース結果を取得する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('2d6+3\n1d20\nCC<=50');
      const lines = palette.getPalette();
      expect(lines).toContain('2d6+3');
      expect(lines).toContain('1d20');
      expect(lines).toContain('CC<=50');
    });

    it('空のパレットは空配列を返す', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('');
      expect(palette.getPalette()).toEqual(['']);
    });
  });

  describe('paletteLines', () => {
    it('変数行を除いたパレット行を返す', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('2d6\n//HP=10\n1d20');
      const lines = palette.paletteLines;
      expect(lines).toHaveLength(2);
      expect(lines[0].palette).toBe('2d6');
      expect(lines[1].palette).toBe('1d20');
    });
  });

  describe('paletteVariables', () => {
    it('変数定義行をパースする', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('//HP=10\n//MP=20\n2d6');
      const vars = palette.paletteVariables;
      expect(vars).toHaveLength(2);
      expect(vars[0].name).toBe('HP');
      expect(vars[0].value).toBe('10');
      expect(vars[1].name).toBe('MP');
      expect(vars[1].value).toBe('20');
    });

    it('全角スラッシュと全角イコールも認識する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('／／ATK＝5');
      const vars = palette.paletteVariables;
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('ATK');
      expect(vars[0].value).toBe('5');
    });
  });

  describe('paletteIndex', () => {
    it('見出し行を認識する (//-- 形式)', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('//---戦闘---\n2d6\n//---探索---\n1d100');
      const index = palette.paletteIndex;
      expect(index).toHaveLength(2);
      expect(index[0].name).toBe('戦闘');
      expect(index[1].name).toBe('探索');
    });

    it('見出し行を認識する (◆ 形式)', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('◆技能\n1d100\n◆ステータス\n2d6');
      const index = palette.paletteIndex;
      expect(index).toHaveLength(2);
      expect(index[0].name).toBe('技能');
      expect(index[1].name).toBe('ステータス');
    });
  });

  describe('paletteMatch()', () => {
    it('テキストを含む行を検索する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('2d6+3 攻撃\n1d20 命中\n2d6 ダメージ');
      const matches = palette.paletteMatch('2d6');
      expect(matches).toHaveLength(2);
    });
  });

  describe('paletteMatchLine()', () => {
    it('N番目のマッチ行番号を返す', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('line0\nmatch1\nline2\nmatch2');
      expect(palette.paletteMatchLine('match', 0)).toBe(1);
      expect(palette.paletteMatchLine('match', 1)).toBe(3);
    });

    it('マッチしない場合-1を返す', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('abc');
      expect(palette.paletteMatchLine('xyz', 0)).toBe(-1);
    });
  });

  describe('checkTargetCharacter()', () => {
    it('t{}パターンを検出する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      expect(palette.checkTargetCharacter('2d6 t{ATK}')).toBe(true);
    });

    it('T:パターンを検出する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      expect(palette.checkTargetCharacter('T:ターゲット名')).toBe(true);
    });

    it('対象パターンがない場合falseを返す', () => {
      const palette = new ChatPalette();
      palette.initialize();
      expect(palette.checkTargetCharacter('2d6+3')).toBe(false);
    });
  });

  describe('evaluate()', () => {
    it('変数を展開する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('//HP=10\n2d6+{HP}');
      const result = palette.evaluate('2d6+{HP}');
      expect(result).toBe('2d6+10');
    });

    it('未定義変数は空文字に置換する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('2d6');
      const result = palette.evaluate('2d6+{UNDEFINED}');
      expect(result).toBe('2d6+');
    });

    it('PaletteLine引数でも動作する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      palette.setPalette('//ATK=5\n2d6+{ATK}');
      const lines = palette.paletteLines;
      const attackLine = lines.find((l) => l.palette.includes('ATK'));
      if (attackLine) {
        const result = palette.evaluate(attackLine);
        expect(result).toBe('2d6+5');
      }
    });

    it('extendVariables の単純名が重複する場合はパス指定で展開する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      const detail = DataElement.create('detail', '');
      const section = DataElement.create('戦闘特技', '');
      const skillA = DataElement.create('最終能力', '');
      const skillB = DataElement.create('Lv1', '');
      const nameA = DataElement.create('名称', 'オーバークリエイト');
      const nameB = DataElement.create('名称', 'ストラグチャアタック');
      detail.appendChild(section);
      section.appendChild(skillA);
      section.appendChild(skillB);
      skillA.appendChild(nameA);
      skillB.appendChild(nameB);

      expect(palette.evaluate('{名称}', detail)).toBe('');
      expect(palette.evaluate('{戦闘特技/最終能力/名称}', detail)).toBe('オーバークリエイト');
      expect(palette.evaluate('{戦闘特技/Lv1/名称}', detail)).toBe('ストラグチャアタック');
    });

    it('evaluateWithAttachments は画像フィールド参照を添付画像として回収する', () => {
      const palette = new ChatPalette();
      palette.initialize();
      const detail = DataElement.create('detail', '');
      const profile = DataElement.create('プロフィール', '');
      const basic = DataElement.create('基本', '');
      const image = DataElement.create('参考画像', 'image-stamp-id', { fieldType: DataElementFieldType.IMAGE });
      detail.appendChild(profile);
      profile.appendChild(basic);
      basic.appendChild(image);

      const result = palette.evaluateWithAttachments('確認 {プロフィール/基本/参考画像}', detail);

      expect(result.text).toBe('確認 ');
      expect(result.attachmentImageIdentifiers).toEqual(['image-stamp-id']);
      expect(palette.evaluate('確認 {プロフィール/基本/参考画像}', detail)).toBe('確認 image-stamp-id');
    });
  });

  describe('BuffPalette / DiceTablePalette', () => {
    it('BuffPaletteはChatPaletteのサブクラス', () => {
      const bp = new BuffPalette();
      bp.initialize();
      expect(bp).toBeInstanceOf(ChatPalette);
    });

    it('DiceTablePaletteはChatPaletteのサブクラス', () => {
      const dtp = new DiceTablePalette();
      dtp.initialize();
      expect(dtp).toBeInstanceOf(ChatPalette);
    });
  });
});
