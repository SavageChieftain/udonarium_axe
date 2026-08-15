import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildDx3AppspotCharacter,
  isDx3AppspotCharacter,
} from '@axe/domain/character/import/system-profiles/dx3-appspot-profile';

describe('buildDx3AppspotCharacter', () => {
  // built from real data of one system at the warehouse
  const dx3 = {
    base: {
      name: '六条 錐華',
      nameKana: 'ろくじょう すいか',
      sex: '女',
      age: '24',
      cover: '魔法使い',
      works: 'UGNエージェント',
      memo: 'メモ文',
      syndromes: {
        primary: { syndrome: 'エグザイル' },
        secondary: { syndrome: 'ハヌマーン' },
        tertiary: { syndrome: null },
      },
    },
    baseAbility: { body: { total: '5' }, sense: { total: '2' }, mind: { total: '1' }, society: { total: '2' } },
    subAbility: {
      hp: { total: '31' },
      erotion: { total: '32' },
      action: { total: '5' },
      moveZen: { total: '20' },
      moveSen: { total: '10' },
    },
    skills: {
      hak: { A: { lv: '2' } },
      kai: { A: { lv: null } },
      sha: { A: { lv: '1' } },
      tik: { A: { lv: null } },
      rc: { A: { lv: null } },
      isi: { A: { lv: '3' } },
      kou: { A: { lv: null } },
      tyo: { A: { lv: null } },
      B: [{ name1: '情報：UGN', lv1: '1', name2: null }],
    },
    arts: [{ name: 'リザレクト', level: '1', timing: 'オートアクション', cost: null, notes: null }],
    combo: [
      {
        name: 'Slated',
        under100: {
          timing: 'メジャー',
          type: '白兵',
          attack: '11',
          cost: '9',
          range: '至近',
          target: '単体',
          notes: '効果文',
        },
      },
    ],
    weapons: [{ name: '西洋剣', attack: '4', guard: '4', range: '至近', skill: '白兵', type: '白兵', notes: 'メモ' }],
    armours: [{ name: null, armour: null, type: null }],
    items: [{ name: 'デモンズシード', skill: null, notes: 'エフェクト浸食+1' }],
    lois: [{ name: '剛柔の魔女', type: 'なし', Pemotion: '好奇心', Nemotion: '侮蔑', txt: '説明文' }],
    outline: '性別：女 年齢：24',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('recognises the system', () => {
    expect(isDx3AppspotCharacter(dx3)).toBe(true);
    expect(isDx3AppspotCharacter({ kind: 'character' })).toBe(false);
  });

  it('takes the name, the notes and the dice bot', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.name).toBe('六条 錐華');
    expect(result.memo).toBe('メモ文');
    expect(result.dicebot).toBe('DoubleCross');
  });

  it('takes the abilities, the initiative and the movement as fields, leaving the resources out', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    expect(result.params).toContainEqual({ label: '肉体', value: '5' });
    expect(result.params).toContainEqual({ label: '社会', value: '2' });
    expect(result.params).toContainEqual({ label: '行動値', value: '5' });
    expect(result.params).toContainEqual({ label: '全力移動', value: '20' });
    expect(result.params.some((param) => param.label === 'HP')).toBe(false);
    expect(result.params.some((param) => param.label === '侵蝕率')).toBe(false);
  });

  it('takes the health and the encroachment as resources, the latter to a hundred', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    expect(result.statuses).toContainEqual({ label: 'HP', value: 31, max: 31 });
    expect(result.statuses).toContainEqual({ label: '侵蝕率', value: 32, max: 100 });
  });

  it('spreads the common skills under their abilities and the free ones among the rest', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    const skills = findSection(result.sections, '技能')!;
    expect(findGroupFields(skills, '肉体技能')).toContainEqual({ label: '白兵', value: 2, kind: 'number' });
    expect(findGroupFields(skills, '感覚技能')).toContainEqual({ label: '射撃', value: 1, kind: 'number' });
    expect(findGroupFields(skills, '精神技能')).toContainEqual({ label: '意志', value: 3, kind: 'number' });
    expect(findGroupFields(skills, 'その他技能')).toContainEqual({ label: '情報：UGN', value: 1, kind: 'number' });
  });

  it('gathers the effects, the combos, the weapons, the items and the bonds into labelled sections', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    expect(findGroupFields(findSection(result.sections, 'エフェクト')!, 'リザレクト')).toContainEqual({
      label: 'レベル',
      value: 1,
      kind: 'number',
    });
    const combo = findGroupFields(findSection(result.sections, 'コンボ')!, 'Slated');
    expect(combo).toContainEqual({ label: 'タイミング', value: 'メジャー', kind: 'text' });
    expect(combo).toContainEqual({ label: '攻撃力', value: 11, kind: 'number' });
    expect(combo).toContainEqual({ label: '侵蝕値', value: 9, kind: 'number' });
    expect(findGroupFields(findSection(result.sections, '武器')!, '西洋剣')).toContainEqual({
      label: '技能',
      value: '白兵',
      kind: 'text',
    });
    expect(findSection(result.sections, 'アイテム')!.groups.map((group) => group.label)).toEqual(['デモンズシード']);
    expect(findGroupFields(findSection(result.sections, 'ロイス')!, '剛柔の魔女')).toContainEqual({
      label: 'P感情',
      value: '好奇心',
      kind: 'text',
    });
  });

  it('passes over an empty armour row and gathers the syndromes into the profile', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    expect(findSection(result.sections, '防具')).toBeUndefined();
    const profile = findSection(result.sections, 'プロフィール')!;
    expect(findGroupFields(profile, '基本')).toContainEqual({
      label: 'シンドローム',
      value: 'エグザイル／ハヌマーン',
      kind: 'text',
    });
    expect(findGroupFields(profile, '基本')).toContainEqual({ label: 'カヴァー', value: '魔法使い', kind: 'text' });
  });

  it('builds the rolls of that system into the palette, with each skill at its own level', () => {
    const result = buildDx3AppspotCharacter(dx3)!;
    expect(result.commands).toContain('{肉体}DX 【肉体】');
    expect(result.commands).toContain('{肉体}DX+2 【白兵】');
    expect(result.commands).toContain('{感覚}DX+1 【射撃】');
    expect(result.commands).toContain('{精神}DX+3 【意志】');
    expect(result.commands).toContain('{肉体}DX 【回避】');
    // leaves a free skill with no ability out of the palette
    expect(result.commands).not.toContain('情報：UGN');
  });
});
