import { EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  collectTags,
  filterPresets,
  groupPresets,
  isMultiTarget,
  matchesQuery,
} from '@axe/features/effect/effect-library-panel/effect-library-list';

describe('エフェクト集の一覧', () => {
  let created: EffectPreset[] = [];

  function makePreset(name: string, tag: string, grade = 2): EffectPreset {
    const preset = new EffectPreset(`preset-${created.length}`);
    preset.name = name;
    preset.tagName = tag;
    preset.grade = grade;
    created.push(preset);
    return preset;
  }

  afterEach(() => {
    created = [];
  });

  describe('matchesQuery()', () => {
    const preset = () => makePreset('ファイアボルト', '射撃');

    it('空の検索語はすべて通すこと', () => {
      expect(matchesQuery(preset(), '   ')).toBe(true);
    });

    it('名前の一部で拾えること', () => {
      expect(matchesQuery(preset(), 'ボルト')).toBe(true);
      expect(matchesQuery(preset(), '氷結')).toBe(false);
    });

    it('系統名でも拾えること', () => {
      expect(matchesQuery(preset(), '射撃')).toBe(true);
    });

    it('英字は大小を区別しないこと', () => {
      expect(matchesQuery(makePreset('Fire Bolt', 'shot'), 'fire')).toBe(true);
    });
  });

  describe('filterPresets()', () => {
    function catalog(): EffectPreset[] {
      return [
        makePreset('火の矢', '射撃', 1),
        makePreset('ファイアボルト', '射撃', 2),
        makePreset('氷結', '氷', 2),
        makePreset('絶対零度', '氷', 3),
      ];
    }

    it('系統で絞り込めること', () => {
      expect(filterPresets(catalog(), '', '氷', null).map((preset) => preset.name)).toEqual(['氷結', '絶対零度']);
    });

    it('等級で絞り込めること', () => {
      expect(filterPresets(catalog(), '', null, 3).map((preset) => preset.name)).toEqual(['絶対零度']);
    });

    it('検索語と組み合わせられること', () => {
      expect(filterPresets(catalog(), '矢', '射撃', 1).map((preset) => preset.name)).toEqual(['火の矢']);
    });
  });

  describe('狙える数での絞り込み', () => {
    function targetsCatalog(): EffectPreset[] {
      const single = makePreset('斬撃', '物理');
      single.targeting = 'single';
      const self = makePreset('闘気', '強化');
      self.targeting = 'self';
      const multi = makePreset('爆炎', '炎');
      multi.targeting = 'multi';
      multi.maxTargets = 6;
      return [single, self, multi];
    }

    it('複数を巻き込めるものだけを残せること', () => {
      expect(filterPresets(targetsCatalog(), '', null, null, 'multi').map((preset) => preset.name)).toEqual(['爆炎']);
    });

    it('単体しか狙えないものだけを残せること', () => {
      // 自分だけに掛かるものも「単体」に含める。
      expect(filterPresets(targetsCatalog(), '', null, null, 'single').map((preset) => preset.name)).toEqual([
        '斬撃',
        '闘気',
      ]);
    });

    it('指定が無ければ全部通すこと', () => {
      expect(filterPresets(targetsCatalog(), '', null, null, null)).toHaveLength(3);
    });

    it('複数対象かどうかを上限で判定すること', () => {
      const [single, , multi] = targetsCatalog();

      expect(isMultiTarget(single)).toBe(false);
      expect(isMultiTarget(multi)).toBe(true);
    });
  });

  describe('groupPresets()', () => {
    it('系統ごとにまとめ、既定の系統順に並べること', () => {
      const groups = groupPresets([makePreset('氷結', '氷'), makePreset('斬撃', '物理'), makePreset('爆炎', '炎')]);

      expect(groups.map((group) => group.tag)).toEqual(['物理', '炎', '氷']);
    });

    it('系統の中では等級順に並べること', () => {
      const groups = groupPresets([
        makePreset('絶対零度', '氷', 3),
        makePreset('氷礫', '氷', 1),
        makePreset('氷結', '氷', 2),
      ]);

      expect(groups[0].presets.map((preset) => preset.name)).toEqual(['氷礫', '氷結', '絶対零度']);
    });

    it('知らない系統と無記名を後ろへ回すこと', () => {
      const groups = groupPresets([makePreset('謎', ''), makePreset('自作', '独自'), makePreset('斬撃', '物理')]);

      expect(groups.map((group) => group.tag)).toEqual(['物理', '独自', '']);
    });
  });

  describe('collectTags()', () => {
    it('重複を畳んで既定の系統順に返すこと', () => {
      const tags = collectTags([
        makePreset('氷結', '氷'),
        makePreset('絶対零度', '氷'),
        makePreset('斬撃', '物理'),
        makePreset('無記名', ''),
      ]);

      expect(tags).toEqual(['物理', '氷']);
    });
  });
});
