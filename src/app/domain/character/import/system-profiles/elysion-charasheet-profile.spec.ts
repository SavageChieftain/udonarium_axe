import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildElysionCharasheetCharacter,
  isElysionCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/elysion-charasheet-profile';

describe('buildElysionCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の エリュシオン（game="elysion"）実データに即した構造
  const elysion = {
    pc_name: 'マリ',
    game: 'elysion',
    NB1: '2',
    NB2: '3',
    NB3: '5',
    Power_name: ['生存訓練', '変化の術'],
    Power_Level: ['1', '1'],
    Power_hantei: ['0', '2'],
    Power_cost: ['', '1'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="elysion" を判別する', () => {
    expect(isElysionCharasheetCharacter(elysion)).toBe(true);
    expect(isElysionCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('3 主能力（学力/青春力/政治力）と dicebot Elysion を取り込む', () => {
    const result = buildElysionCharasheetCharacter(elysion)!;
    expect(result.dicebot).toBe('Elysion');
    expect(result.params).toEqual([
      { label: '学力', value: '2' },
      { label: '青春力', value: '3' },
      { label: '政治力', value: '5' },
    ]);
  });

  it('スキルを名前付きで展開し、能力コードを作成ページの権威マップで変換する', () => {
    const result = buildElysionCharasheetCharacter(elysion)!;
    const skills = findSection(result.sections, 'スキル')!;
    expect(skills.groups.map((group) => group.label)).toEqual(['生存訓練', '変化の術']);
    // Power_hantei=2 → 青春力。指定なし(0)は能力フィールドを出さない
    expect(skills.groups[1].fields).toContainEqual({ label: '能力', value: '青春力', kind: 'text' });
    expect(skills.groups[0].fields.some((field) => field.label === '能力')).toBe(false);
  });

  it('チャットパレットに EL{能力値} の判定を生成する', () => {
    const result = buildElysionCharasheetCharacter(elysion)!;
    expect(result.commands).toContain('EL2 【学力判定】');
    expect(result.commands).toContain('EL5 【政治力判定】');
  });
});
