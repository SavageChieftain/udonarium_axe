import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildParablaCharasheetCharacter,
  isParablaCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/parabla-charasheet-profile';

describe('buildParablaCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の パラサイトブラッド（game="parabla"）実データに即した構造
  const parabla = {
    pc_name: 'カイン',
    game: 'parabla',
    race: '人間',
    S1: '5',
    S2: '5',
    S3: '2',
    S4: '4',
    S5: '8',
    S6: '6',
    NB1: '7',
    NB2: '7',
    NB3: '4',
    NB4: '6',
    NB5: '12',
    NB6: '8',
    Power_name: ['ダークヒーロー', 'レイジングインフェルノ'],
    Power_timing: ['瞬間', '攻撃'],
    Power_cost: ['なし', '衝動１'],
    Power_memo: ['変身する', '炎で攻撃'],
    arms_name: ['ナイフ'],
    arms_hit: ['2'],
    arms_damage_dice: ['2'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="parabla" を判別する', () => {
    expect(isParablaCharasheetCharacter(parabla)).toBe(true);
    expect(isParablaCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('6 能力値（肉体/機敏/感覚/幸運/知力/精神）と dicebot ParasiteBlood を取り込む', () => {
    const result = buildParablaCharasheetCharacter(parabla)!;
    expect(result.dicebot).toBe('ParasiteBlood');
    expect(result.params).toEqual([
      { label: '肉体', value: '5' },
      { label: '機敏', value: '5' },
      { label: '感覚', value: '2' },
      { label: '幸運', value: '4' },
      { label: '知力', value: '8' },
      { label: '精神', value: '6' },
    ]);
  });

  it('異能・武器を名前付きで展開する', () => {
    const result = buildParablaCharasheetCharacter(parabla)!;
    expect(findSection(result.sections, '異能')!.groups.map((group) => group.label)).toEqual([
      'ダークヒーロー',
      'レイジングインフェルノ',
    ]);
    expect(findSection(result.sections, '武器')!.groups[0].label).toBe('ナイフ');
  });

  it('チャットパレットに 2d6+判定値 の能力判定を生成する', () => {
    const result = buildParablaCharasheetCharacter(parabla)!;
    expect(result.commands).toContain('2d6+7 【肉体判定】');
    expect(result.commands).toContain('2d6+12 【知力判定】');
  });
});
